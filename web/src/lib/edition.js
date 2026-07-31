// 面（今日の紙面）の編成エンジン。
//
// 面はスコア順のフィードではない。**固定の段があり、各段に適格なカード型が優先順で並ぶ**。
// 在庫が無ければ次の型に落ちる。これが「材料が枯れても面が死なない」ことの構造的保証で、
// リード段は必ず feature か revival まで落ちるため、記事が1件でもあれば空にならない。
//
// 紙面は**ビルド日ではなく閲覧日**（クライアントの new Date()）で組む。push が2週間止まっても
// 再読・特集・復刻・連載は毎日入れ替わる。乱数は使わず、日付シードのハッシュで日替わりを作る
// （リロードで引き直せると賭博になり、その日のコミットが消える）。

import { effectiveNext, effectiveSrs, daysBetween, todayISO } from './recall.js';
import { cleanTitle } from './graph.js';

export const dayIndex = (iso) => Math.floor(new Date(`${iso}T00:00:00`).getTime() / 86400000);
export const hash32 = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
const pickOfDay = (arr, today, salt = '') =>
  arr.length ? arr[(dayIndex(today) + hash32(salt)) % arr.length] : null;

// ---- 再読キュー ----
// 期日が来たものだけを母集団にし、遅延・未再読・ハブ度・問いの有無・日替わり浮上で並べる。
// 「59件の借金」ではなく「今日の3枚」にするのが要点で、総量はどこにも表示しない。
export function recallQueue(site, graph, shadow, today, limit = 3) {
  const scored = [];
  for (const n of site.notes) {
    if (n.kind !== 'knowledge') continue;
    const next = effectiveNext(n, shadow);
    if (!next) continue;
    const over = daysBetween(today, next);
    if (over < 0) continue; // 期日前は出さない
    const s = effectiveSrs(n, shadow);
    const backs = graph.backlinks.get(`/note/${n.slug}`)?.length || 0;
    const score =
      Math.min(over, 120) +            // 遅延（120日で頭打ち＝古参の独占を防ぐ）
      (s?.last ? 0 : 25) +             // 一度も再読していない
      Math.min(backs, 6) * 4 +         // ハブ度（多くから参照される＝重要）
      (n.recall ? 8 : 0) +             // 良い問いが用意されている
      ((hash32(n.slug) + dayIndex(today)) % 7 === 0 ? 20 : 0); // 日替わり浮上
    scored.push({ note: n, score, over });
  }
  scored.sort((a, b) => b.score - a.score || a.note.slug.localeCompare(b.note.slug));
  return scored.slice(0, limit);
}

// ---- 連載（アトラスの続き） ----
function chapterCard(site, reads) {
  for (const a of site.atlases || []) {
    const read = reads[a.slug] || new Set();
    for (const r of a.routes) {
      const steps = r.order.map((s) => a.concepts.find((c) => c.slug === s)).filter(Boolean);
      if (!steps.length) continue;
      const readCount = steps.filter((s) => read.has(s.slug)).length;
      if (readCount === 0) continue; // 読み始めているルートを「続き」とみなす
      const nextStep = steps.find((s) => !read.has(s.slug));
      if (!nextStep) continue;
      return {
        type: 'chapter', atlas: a, route: r, concept: nextStep,
        readCount, total: steps.length,
      };
    }
  }
  // まだ何も読んでいない場合は先頭ルートの1歩目を差し出す
  for (const a of site.atlases || []) {
    const r = a.routes[0];
    const first = r && a.concepts.find((c) => c.slug === r.order[0]);
    if (first) return { type: 'chapter', atlas: a, route: r, concept: first, readCount: 0, total: r.order.length };
  }
  return null;
}

// ---- 特集（MOCの束 / タグ束）----
function featureCard(graph, today) {
  const usable = graph.bundles.filter((b) => b.items.length >= 3);
  if (usable.length) {
    const b = pickOfDay(usable, today, 'feature');
    return { type: 'feature', bundle: b };
  }
  const bigTags = graph.tags.filter((t) => t.count >= 3);
  if (bigTags.length) {
    const t = pickOfDay(bigTags, today, 'featuretag');
    return { type: 'feature', bundle: { title: t.label, tag: t.tag, items: t.nodes.slice(0, 4).map((n) => ({ node: n, reason: '' })) } };
  }
  return null;
}

// ---- 復刻（最終更新が最も古い群からの日替わり）----
function revivalCard(site, today) {
  const pool = site.notes
    .filter((n) => n.updated)
    .sort((a, b) => (a.updated < b.updated ? -1 : 1))
    .slice(0, 20);
  const n = pickOfDay(pool, today, 'revival');
  if (!n) return null;
  return { type: 'revival', note: n, ago: daysBetween(today, n.updated) };
}

// ---- リード段の候補 ----
function speedCard(site, graph, today) {
  const fresh = graph.nodes
    .filter((n) => n.updated && daysBetween(today, n.updated) <= 2 && daysBetween(today, n.updated) >= 0)
    .sort((a, b) => (a.updated < b.updated ? 1 : -1));
  return fresh.length ? { type: 'speed', node: fresh[0], ago: daysBetween(today, fresh[0].updated) } : null;
}

// 節目＝「良い方向に」記録を更新したとき。goal を宣言していない中立の指標では発火させない
// （フェース角のように大きくなるほど悪い指標を「自己ベスト」として一面に出すと嘘になる）。
function milestoneCard(site, today) {
  for (const f of site.follows) {
    if (f.followType !== 'goal' || !f.series?.length) continue;
    for (const s of f.series) {
      if (!s.goal || s.points.length < 3) continue;
      const last = s.points[s.points.length - 1];
      const prev = s.points.slice(0, -1).map((p) => p.value);
      const improved = s.goal === 'up' ? last.value > Math.max(...prev) : last.value < Math.min(...prev);
      if (!improved) continue;
      if (daysBetween(today, last.date) > 7) continue;
      return { type: 'milestone', follow: f, series: s, point: last };
    }
  }
  return null;
}

function chapterNewCard(site, reads, today) {
  for (const a of site.atlases || []) {
    const read = reads[a.slug] || new Set();
    const fresh = a.concepts.filter(
      (c) => c.status !== 'stub' && c.created && daysBetween(today, c.created) <= 7 && !read.has(c.slug),
    );
    if (fresh.length) return { type: 'chapter-new', atlas: a, concept: fresh[0] };
  }
  return null;
}

function briefCard(site, today) {
  for (const f of site.follows) {
    const m = (f.nextMatches || []).find((x) => x.date && daysBetween(today, x.date) <= 0);
    if (!m) continue;
    const days = -daysBetween(today, m.date);
    if (days > 7) continue;
    return { type: 'brief', follow: f, match: m, days };
  }
  return null;
}

// ---- 袖・記録 ----
function countdownCard(site, today) {
  const all = site.follows
    .flatMap((f) => (f.nextMatches || []).map((m) => ({ follow: f, match: m })))
    .filter((x) => x.match.date && daysBetween(today, x.match.date) <= 0)
    .sort((a, b) => (a.match.date < b.match.date ? -1 : 1));
  if (!all.length) return null;
  const x = all[0];
  return { type: 'countdown', follow: x.follow, match: x.match, days: -daysBetween(today, x.match.date) };
}

function recordCards(site, today) {
  const out = [];
  for (const f of site.follows) {
    if (f.followType === 'goal' && f.series?.some((s) => s.points.length >= 2)) {
      out.push({ type: 'series', follow: f });
    }
  }
  for (const t of site.logtopics || []) {
    if (t.entries.length >= 2) out.push({ type: 'compare', topic: t });
  }
  return out.slice(0, 2);
}

// ---- 面の組版 ----
export function composeEdition({ site, graph, shadow, reads, pendingCount, today = todayISO() }) {
  const lead =
    speedCard(site, graph, today) ||
    milestoneCard(site, today) ||
    chapterNewCard(site, reads, today) ||
    briefCard(site, today) ||
    featureCard(graph, today) ||
    revivalCard(site, today);

  const aside = [];
  const cd = countdownCard(site, today);
  if (cd) aside.push(cd);
  if (pendingCount >= 3) aside.push({ type: 'slip', count: pendingCount });

  const recall = recallQueue(site, graph, shadow, today, 3);
  const chapter = chapterCard(site, reads);

  // リードで特集を使ったら、特集段は別の束を出す（同じものを2回出さない）
  let feature = featureCard(graph, today);
  if (lead?.type === 'feature' && feature?.bundle?.id === lead.bundle?.id) {
    const rest = graph.bundles.filter((b) => b.items.length >= 3 && b.id !== lead.bundle.id);
    feature = rest.length ? { type: 'feature', bundle: pickOfDay(rest, today, 'feature2') } : null;
  }

  const records = recordCards(site, today);

  const inventory = {
    notes: site.notes.length,
    concepts: (site.atlases || []).reduce((s, a) => s + a.concepts.length, 0),
    sessions: site.follows.reduce((s, f) => s + f.sessions.length, 0),
    entries: (site.logtopics || []).reduce((s, t) => s + t.entries.length, 0),
    topics: (site.logtopics || []).length,
  };

  // 記事が3件未満のときは特集段ごと非表示（薄い在庫で束を装わない）
  if (site.notes.length < 3) feature = null;

  return { lead, aside, recall, chapter, feature, records, inventory, today };
}

// 「更新 N日前」。ビルド日と閲覧日の差を出して、面が古びていないことを可視化する
export const staleness = (generatedAt, today = todayISO()) => daysBetween(today, generatedAt);

export const followLabel = (f) => cleanTitle(f.title);
