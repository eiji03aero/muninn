// 想起（再読）のローカル状態と、正本への書き戻し伝票。
//
// 静的サイトなので srs を markdown に書き戻せない。そこで:
//   1. 判定は localStorage の「影SRS」に即座に効かせる（体験としては今日からSRSが回る）
//   2. 判定は「伝票」として溜まり、デスクから1回のプロンプトで /mn-review に流し込む
//   3. 次のビルドで正本が追いついたら、影SRSをサーバ値で上書きして伝票を消す（自己修復同期）
//
// 影SRSは .claude/skills/mn-review/SKILL.md と**まったく同じ SM-2 簡易版**を使う。
// 式が同じなので、送信しても送信しなくても値が乖離しない。

const KEY_SHADOW = 'mn.recall.shadow';
const KEY_PENDING = 'mn.recall.pending';
const KEY_LOG = 'mn.recall.log';
const KEY_SEEN = 'mn.seen';

const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 容量超過等は黙って諦める */ } };

// 再読の履歴に「どの面から記録されたか」を添えるためのラベル。
// **ここは面を解釈しない**——ただ渡された文字列を記録に付けるだけで、
// 影SRSの計算も出題も面によって変わらない（変わったら面ごとに定着が食い違う）。
// 3面のうちどれを残すかを判断するときの材料になる（web/DESIGN.md §11）。
let logSource = null;
export const setLogSource = (s) => { logSource = s || null; };

export const todayISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return todayISO(d);
};
export const daysBetween = (a, b) => Math.round((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 86400000);

// ---- SM-2 簡易版（mn-review と同一） ----
// damp: サイト由来の判定は自己申告なので ease の伸びを 30% 抑える。
// 「本文を読んだ直後にわかったを押す」ことへの心理的抵抗の低さを、アルゴリズム側で補正する。
export function grade(prev, q, today, { damp = false } = {}) {
  let interval = prev?.interval ?? 0;
  let ease = prev?.ease ?? 2.5;
  if (q < 3) {
    interval = 1;
  } else {
    interval = interval === 0 ? 1 : interval === 1 ? 6 : Math.round(interval * ease);
    let delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    if (damp && delta > 0) delta *= 0.7;
    ease = Math.max(1.3, ease + delta);
  }
  return { last: today, interval, ease: Math.round(ease * 1000) / 1000, next: addDays(today, interval) };
}

// 「わかった」＋自分の言葉を書いた → q5 / 書かずに「わかった」 → q4 / 「あやしい」 → q2。
// 一言を書かせることで、mn-review の「本人の言葉で再構成できて初めて q>=4」という規律に近づける。
export const verdictToQ = (ok, wroteNote) => (ok ? (wroteNote ? 5 : 4) : 2);

// ---- 影SRS ----
// サーバ（正本）が追いついた分は捨て、ローカルに残すのは「まだ正本に反映されていない判定」だけ。
export function loadShadow(site) {
  const shadow = read(KEY_SHADOW, {});
  let pending = read(KEY_PENDING, []);
  let changed = false;

  const bySlug = new Map(site.notes.map((n) => [n.slug, n]));
  for (const slug of Object.keys(shadow)) {
    const note = bySlug.get(slug);
    if (!note) { delete shadow[slug]; changed = true; continue; }
    const serverLast = note.srs?.last;
    // 正本の last がローカル判定日に追いついた＝反映済み。サーバ値を正とする
    if (serverLast && shadow[slug].last && serverLast >= shadow[slug].last) {
      delete shadow[slug];
      changed = true;
    }
  }
  const before = pending.length;
  pending = pending.filter((p) => {
    const note = bySlug.get(p.slug);
    if (!note) return false;
    return !(note.srs?.last && note.srs.last >= p.date);
  });
  if (pending.length !== before) write(KEY_PENDING, pending);
  if (changed) write(KEY_SHADOW, shadow);
  return shadow;
}

// 実効的な srs（影があればそれ、無ければ正本）
export const effectiveSrs = (note, shadow) => shadow[note.slug] || note.srs || null;
export const effectiveNext = (note, shadow) => {
  const s = effectiveSrs(note, shadow);
  return s?.next || note.created || null;
};

export function recordVerdict(note, ok, wroteNote, shadow) {
  const today = todayISO();
  const q = verdictToQ(ok, wroteNote);
  const next = grade(effectiveSrs(note, shadow), q, today, { damp: true });
  const s = read(KEY_SHADOW, {});
  s[note.slug] = next;
  write(KEY_SHADOW, s);

  const pending = read(KEY_PENDING, []).filter((p) => p.slug !== note.slug);
  pending.push({ slug: note.slug, title: note.title, q, date: today });
  write(KEY_PENDING, pending);

  const log = read(KEY_LOG, []);
  log.push({ slug: note.slug, q, date: today, via: logSource });
  write(KEY_LOG, log.slice(-400));
  return next;
}

// recordVerdict の逆操作。**取り消せない操作を作らない**ためにここに置く——
// 影SRS・伝票・履歴の3つを同時に動かすのは recordVerdict なので、その巻き戻しも同じ場所に置かないと
// 面ごとに localStorage を直接いじる実装が生えて、キーの持ち主が曖昧になる。
// prevShadow は判定する**前**の shadow[slug]（無かったなら undefined）を呼び出し側が控えておく。
// 注意: 同じノートに対する「もっと前の日の未送信伝票」は recordVerdict の時点で既に潰れているので戻らない。
export function undoVerdict(slug, prevShadow) {
  const s = read(KEY_SHADOW, {});
  if (prevShadow) s[slug] = prevShadow; else delete s[slug];
  write(KEY_SHADOW, s);
  write(KEY_PENDING, read(KEY_PENDING, []).filter((p) => p.slug !== slug));
  const log = read(KEY_LOG, []);
  const i = log.map((l) => l.slug).lastIndexOf(slug);
  if (i >= 0) { log.splice(i, 1); write(KEY_LOG, log); }
}

export const loadPending = () => read(KEY_PENDING, []);
export const clearPending = () => write(KEY_PENDING, []);
export const recallLog = () => read(KEY_LOG, []);

// 直近7日で何件再読したか。数えるのは「やった量」であって借金ではない。
export function doneThisWeek() {
  const from = addDays(todayISO(), -6);
  return recallLog().filter((r) => r.date >= from).length;
}

// ---- 伝票（Claude への依頼キュー） ----
// 想起の判定以外（深掘り・執筆依頼・繋ぎ直し等）もここに溜め、デスクで束ねて1回で渡す。
const KEY_SLIPS = 'mn.slips';
export const loadSlips = () => read(KEY_SLIPS, []);
export function addSlip(slip) {
  const slips = read(KEY_SLIPS, []);
  if (slips.some((s) => s.id === slip.id)) return slips;
  const next = [...slips, { ...slip, date: todayISO() }];
  write(KEY_SLIPS, next);
  return next;
}
export function removeSlip(id) {
  const next = loadSlips().filter((s) => s.id !== id);
  write(KEY_SLIPS, next);
  return next;
}
export const clearSlips = () => write(KEY_SLIPS, []);

// ---- 最近見たもの（探すの空クエリで出す） ----
export function markSeen(route, title) {
  const seen = read(KEY_SEEN, []).filter((s) => s.route !== route);
  seen.unshift({ route, title, at: Date.now() });
  write(KEY_SEEN, seen.slice(0, 8));
}
export const loadSeen = () => read(KEY_SEEN, []);

// ---- アトラス読了（既存実装の localStorage を踏襲） ----
export function loadRead(slug) {
  try { return new Set(JSON.parse(localStorage.getItem(`mn.atlas.${slug}.read`) || '[]')); } catch { return new Set(); }
}
export function saveRead(slug, set) {
  try { localStorage.setItem(`mn.atlas.${slug}.read`, JSON.stringify([...set])); } catch { /* noop */ }
}

// ---- 依頼プロンプトの生成 ----
export function reviewPrompt(pending) {
  return [
    '/mn-review 一括反映（サイト由来）。以下は muninn のサイトで自己採点した再読の結果。',
    '出題はせず、各ノートの srs を SM-2 簡易版で更新し review-log.jsonl に追記して commit/push して。',
    'q は下記の値を採点済みとして扱うこと（answer は「サイトで自己採点」と記録してよい）。',
    '',
    ...pending.map((p) => `- ${p.slug} : q=${p.q} (${p.date})`),
  ].join('\n');
}

export function slipsPrompt(slips, pending) {
  const parts = [];
  if (pending.length) parts.push(reviewPrompt(pending));
  const byKind = {};
  for (const s of slips) (byKind[s.kind] ||= []).push(s);
  for (const [kind, list] of Object.entries(byKind)) {
    parts.push('');
    parts.push(list[0].intro);
    for (const s of list) parts.push(`- ${s.line}`);
  }
  return parts.join('\n');
}
