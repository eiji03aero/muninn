#!/usr/bin/env node
// build-data.mjs — muninn の markdown（正本）を正規化JSONに変換してサイトへ渡す派生ビルド。
//   follows/**  → follows（profile / entities / sessions）
//   notes/*.md  → notes（kind: knowledge / insight、復習期限フラグ付き）
//   moc/*.md    → mocs
// frontmatter を構造化データとして採り、body は生markdownのまま渡す（クライアントで描画）。
// 出力: web/public/site.json（平文, dev）。環境変数 MN_SITE_PASSWORD があれば
//        web/public/site.enc.json（AES-256-GCM 暗号化, 本番）のみを出力する。
//
// 依存: gray-matter（frontmatterのYAML解析）。Node標準の crypto で暗号化。
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pbkdf2Sync, randomBytes, createCipheriv } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(WEB, '..');
const OUT = join(WEB, 'public');
const today = new Date().toISOString().slice(0, 10);

// ---------- git 最終更新日 ----------
// 「復刻（最終更新が最も古い記事）」「久しく読んでいない」の材料。1回の git log で全ファイル分を引く。
// CI では actions/checkout の fetch-depth: 0 が必要（浅いクローンだと履歴が足りない）。
const gitUpdated = (() => {
  const map = new Map();
  try {
    const out = execFileSync('git', ['log', '--pretty=format:%cs', '--name-only'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    });
    let cur = null;
    for (const line of out.split('\n')) {
      const s = line.trim();
      if (!s) continue;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { cur = s; continue; }
      if (cur && !map.has(s)) map.set(s, cur); // log は新しい順なので初出＝最終更新
    }
  } catch {
    console.warn('⚠️  git 履歴を読めなかった（updated は created で代替する）');
  }
  return map;
})();
const updatedOf = (absPath, fallback) =>
  gitUpdated.get(relative(ROOT, absPath).split('\\').join('/')) || fallback || null;

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);
// js-yaml は無引用の YYYY-MM-DD を Date に変換するため YYYY-MM-DD 文字列へ正規化する
const D = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v);
// スカラ/配列/未定義を配列に正規化する
const arrOf = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function mdFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => join(dir, f));
}
function slugOf(path) { return basename(path).replace(/\.md$/, ''); }
function read(path) {
  const { data, content } = matter(readFileSync(path, 'utf8'));
  return { data: data || {}, body: (content || '').trim() };
}
// 本文中の [[target]] / [[target|alias]] を抽出（サイト内リンク解決用）
function wikiTargets(body) {
  const out = [];
  for (const m of body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) out.push(m[1].trim());
  return [...new Set(out)];
}

// ---------- notes ----------
const notes = mdFiles(join(ROOT, 'notes')).map((p) => {
  const { data, body } = read(p);
  const slug = slugOf(p);
  const kind = data.kind || 'knowledge';
  if (!['knowledge', 'insight'].includes(kind)) fail(slug, `notes の kind が不正: ${kind}`);
  if (!data.title) fail(slug, 'title 欠落');
  // due（復習期限フラグ）はビルド日で固定されてしまうため廃止。srs をそのまま渡し、
  // 「今日どれを出すか」はクライアントが閲覧日（new Date()）とローカル影SRSで決める。
  const srs = data.srs || null;
  const next = srs ? D(srs.next) : null;
  return {
    slug, title: data.title || slug, kind,
    tags: data.tags || [], created: D(data.created) || null,
    updated: updatedOf(p, D(data.created)),
    srs: srs
      ? { last: D(srs.last) ?? null, interval: srs.interval ?? 0, ease: srs.ease ?? 2.5, next: next ?? null }
      : null,
    recall: data.recall || null, // 伏せ記事の「問い」。無ければ degrade 表示にフォールバックする
    body, links: wikiTargets(body),
  };
});

// ---------- mocs ----------
// MOC は生 markdown を描画するのをやめ、`##` セクションを「束（人間が編集した索引の単位）」として
// 構造化する。束は棚板の上段と、面の「特集」カードの材料になる。
function mocSections(body) {
  const out = [];
  let cur = null;
  for (const raw of body.split('\n')) {
    const h = raw.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], items: [], lead: '' }; out.push(cur); continue; }
    if (!cur) continue;
    const li = raw.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      const m = li[1].match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*(?:—|--|―)?\s*(.*)$/);
      if (m) cur.items.push({ target: m[1].trim(), alias: (m[2] || '').trim() || null, reason: (m[3] || '').trim() });
    } else if (raw.trim() && !cur.items.length) {
      cur.lead = (cur.lead ? cur.lead + ' ' : '') + raw.trim();
    }
  }
  return out.filter((s) => s.items.length > 0);
}

const mocs = mdFiles(join(ROOT, 'moc')).map((p) => {
  const { data, body } = read(p);
  return {
    slug: slugOf(p), title: data.title || slugOf(p), tags: data.tags || [],
    updated: updatedOf(p, null),
    sections: mocSections(body),
    body, links: wikiTargets(body),
  };
});

// ---------- follows ----------
const followsDir = join(ROOT, 'follows');
const follows = (existsSync(followsDir) ? readdirSync(followsDir, { withFileTypes: true }) : [])
  .filter((d) => d.isDirectory())
  .map((d) => {
    const dir = join(followsDir, d.name);
    const profPath = join(dir, 'profile.md');
    if (!existsSync(profPath)) { fail(d.name, 'profile.md がない'); return null; }
    const { data: pf, body: pbody } = read(profPath);
    if (pf.kind !== 'follow') fail(`${d.name}/profile`, `kind は follow であるべき（実際: ${pf.kind}）`);
    const followType = pf.follow_type || 'goal';

    const entities = mdFiles(join(dir, 'entities')).map((ep) => {
      const { data, body } = read(ep);
      const slug = slugOf(ep);
      if (data.kind !== 'entity') fail(`${d.name}/entities/${slug}`, `kind は entity であるべき`);
      for (const k of ['group', 'role', 'club']) if (!data[k]) fail(`entities/${slug}`, `${k} 欠落`);
      const norm = (v) => (Array.isArray(v) ? v : v ? [v] : []);
      return {
        slug, title: data.title || slug,
        group: data.group || '?', role: data.role || '', club: data.club || '',
        number: data.number ?? null, status: data.status || 'active',
        deepDive: !!data.deep_dive,
        strengths: norm(data.strengths), developing: norm(data.developing),
        clips: norm(data.clips), changelog: norm(data.changelog),
        updated: D(data.updated) || null, body, links: wikiTargets(body),
      };
    });

    // sessions だけ links の抽出が漏れており、観測記録がノートへ張ったリンクがビルド時に
    // 捨てられていた（実測24本）。他の型と同様に wikiTargets を通す。
    // metrics は「推移グラフ」の材料。本文の表をパースすると書式の揺れで欠けるため frontmatter で受ける。
    const sessions = mdFiles(join(dir, 'sessions'))
      .map((sp) => {
        const { data, body } = read(sp);
        const d = D(data.date) || slugOf(sp);
        return {
          date: d, title: d, body,
          summary: data.summary || null,
          metrics: data.metrics || null,
          links: wikiTargets(body),
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    // 観測値の時系列（グラフ用）。metrics を持つ session を古い順に畳む。
    // { 総距離: [{date, value}, ...], ... } の形にして、キー順は最新 session の定義順を尊重する。
    const series = (() => {
      const withM = [...sessions].filter((s) => s.metrics && typeof s.metrics === 'object').reverse();
      if (!withM.length) return [];
      const keys = [...new Set(withM.flatMap((s) => Object.keys(s.metrics)))];
      const goals = pf.metric_goals || {};
      return keys.map((key) => ({
        key,
        // up=大きいほど良い / down=小さいほど良い / null=中立（良し悪しを判定しない）。
        // 宣言のない指標を勝手に「大きいほうが良い」と扱うと、悪化を自己ベストと表示してしまう。
        goal: goals[key] === 'up' || goals[key] === 'down' ? goals[key] : null,
        points: withM
          .map((s) => ({ date: s.date, value: s.metrics[key] }))
          .filter((p) => typeof p.value === 'number'),
      })).filter((s) => s.points.length > 0);
    })();

    return {
      name: d.name, title: pf.title || d.name, followType,
      status: pf.status || 'active', goal: pf.goal || '', tags: pf.tags || [],
      coach: pf.coach || null, formation: pf.formation || null,
      snapshot: pf.snapshot || [], rivals: pf.rivals || [],
      baseline: pf.baseline || [], focus: pf.focus || [],
      nextMatches: (pf.next_matches || []).map((m) => ({ ...m, date: D(m.date) })),
      updated: updatedOf(profPath, null),
      body: pbody, links: wikiTargets(pbody), entities, sessions, series,
    };
  })
  .filter(Boolean);

// ---------- atlases（学習アトラス） ----------
const atlasDir = join(ROOT, 'atlas');
const atlases = (existsSync(atlasDir) ? readdirSync(atlasDir, { withFileTypes: true }) : [])
  .filter((d) => d.isDirectory())
  .map((d) => {
    const dir = join(atlasDir, d.name);
    const atlasPath = join(dir, 'atlas.md');
    if (!existsSync(atlasPath)) { fail(d.name, 'atlas.md がない'); return null; }
    const { data: af, body: abody } = read(atlasPath);
    if (af.kind !== 'atlas') fail(`${d.name}/atlas`, `kind は atlas であるべき（実際: ${af.kind}）`);
    const slug = af.slug || d.name;

    const concepts = mdFiles(join(dir, 'concepts')).map((cp) => {
      const { data, body } = read(cp);
      const cslug = slugOf(cp);
      if (data.kind !== 'concept') fail(`${d.name}/concepts/${cslug}`, `kind は concept であるべき`);
      if (!data.title) fail(`${d.name}/concepts/${cslug}`, 'title 欠落');
      const e = data.edges || {};
      return {
        slug: cslug, title: data.title || cslug, gist: data.gist || '',
        status: data.status || 'written', created: D(data.created) || null,
        updated: updatedOf(cp, D(data.created)),
        edges: {
          requires: arrOf(e.requires), contrasts: arrOf(e.contrasts),
          leadsTo: arrOf(e['leads-to']), elaborates: arrOf(e.elaborates),
        },
        notes: arrOf(data.notes), tags: data.tags || [],
        body, links: wikiTargets(body),
      };
    });

    const routes = arrOf(af.routes).map((r) => ({
      id: r.id, label: r.label || r.id, desc: r.desc || '', order: arrOf(r.order),
    }));

    // 参照整合性の検証
    const cset = new Set(concepts.map((c) => c.slug));
    for (const c of concepts)
      for (const [k, targets] of Object.entries(c.edges))
        for (const t of targets)
          if (!cset.has(t)) fail(`${d.name}/concepts/${c.slug}`, `edge ${k} の参照先がない: ${t}`);
    for (const r of routes)
      for (const s of r.order)
        if (!cset.has(s)) fail(`${d.name}/atlas`, `route ${r.id} の order にない概念: ${s}`);

    return {
      slug, title: af.title || slug, tags: af.tags || [],
      routes, body: abody, links: wikiTargets(abody), concepts,
    };
  })
  .filter(Boolean);

// ---------- logs（トピック別・記録帖） ----------
// topic.md（kind: logtopic）が記録項目のスキーマ(fields)を定義し、entries/*.md（kind: logentry）が
// そのスキーマに沿った1記録。必須欠落・enum外・rating範囲外はビルドを落とす（＝一貫性の砦）。
const FIELD_TYPES = ['text', 'longtext', 'number', 'rating', 'enum', 'tags', 'date', 'bool', 'url'];
const MEDIA_DIR = join(OUT, 'log-media'); // 公開画像のコピー先（gitignore・vite が dist へ同梱）
if (existsSync(MEDIA_DIR)) rmSync(MEDIA_DIR, { recursive: true, force: true });

const logsDir = join(ROOT, 'logs');
const logtopics = (existsSync(logsDir) ? readdirSync(logsDir, { withFileTypes: true }) : [])
  .filter((d) => d.isDirectory())
  .map((d) => {
    const dir = join(logsDir, d.name);
    const topicPath = join(dir, 'topic.md');
    if (!existsSync(topicPath)) { fail(d.name, 'topic.md がない'); return null; }
    const { data: tf, body: tbody } = read(topicPath);
    if (tf.kind !== 'logtopic') fail(`${d.name}/topic`, `kind は logtopic であるべき（実際: ${tf.kind}）`);
    if (!tf.title) fail(`${d.name}/topic`, 'title 欠落');
    const slug = tf.slug || d.name;

    // スキーマ（fields）を正規化・検証する
    const fields = arrOf(tf.fields).map((f) => ({
      key: f.key, label: f.label || f.key, type: f.type || 'text',
      options: arrOf(f.options), unit: f.unit || null,
      required: !!f.required, max: f.max || 5,
    }));
    for (const f of fields) {
      if (!f.key) fail(`${d.name}/topic`, 'field に key がない');
      else if (!FIELD_TYPES.includes(f.type)) fail(`${d.name}/topic`, `field ${f.key} の type が不正: ${f.type}`);
      else if (f.type === 'enum' && !f.options.length) fail(`${d.name}/topic`, `enum field ${f.key} に options がない`);
    }

    const dp = tf.display || {};
    const display = {
      subtitle: dp.subtitle || null, badge: dp.badge || null,
      cardFields: arrOf(dp.card_fields), filters: arrOf(dp.filters),
      sort: { by: dp.sort?.by || null, order: dp.sort?.order || 'desc' },
    };

    // 各記録（entry）をスキーマに照らして検証し、画像を公開先へコピーする
    const entries = mdFiles(join(dir, 'entries')).map((ep) => {
      const { data: ef, body } = read(ep);
      const eslug = slugOf(ep);
      if (ef.kind !== 'logentry') fail(`${d.name}/entries/${eslug}`, 'kind は logentry であるべき');
      if (!ef.title) fail(`${d.name}/entries/${eslug}`, 'title 欠落');
      if (ef.topic && ef.topic !== slug) fail(`${d.name}/entries/${eslug}`, `topic 不一致: ${ef.topic}（期待: ${slug}）`);

      const raw = ef.fields || {};
      const out = {};
      for (const f of fields) {
        let v = raw[f.key];
        const empty = v == null || v === '' || (Array.isArray(v) && v.length === 0);
        if (empty) {
          if (f.required) fail(`${d.name}/entries/${eslug}`, `必須 field ${f.key} が空`);
          continue;
        }
        switch (f.type) {
          case 'number':
          case 'rating':
            if (typeof v !== 'number') fail(`${d.name}/entries/${eslug}`, `field ${f.key} は数値であるべき: ${v}`);
            else if (f.type === 'rating' && (v < 1 || v > f.max)) fail(`${d.name}/entries/${eslug}`, `rating ${f.key} は 1〜${f.max}: ${v}`);
            break;
          case 'enum':
            if (!f.options.includes(v)) fail(`${d.name}/entries/${eslug}`, `field ${f.key} は options 外: ${v}`);
            break;
          case 'tags': v = arrOf(v); break;
          case 'date': v = D(v); break;
          case 'bool': v = !!v; break;
          default: break;
        }
        out[f.key] = v;
      }

      // 画像: 参照があれば実在確認 → public/log-media/<topic>/ へコピー（相対URLを持たせる）
      let imageUrl = null;
      if (ef.image) {
        const src = join(dir, ef.image);
        if (!existsSync(src)) {
          fail(`${d.name}/entries/${eslug}`, `image が存在しない: ${ef.image}`);
        } else {
          const fname = basename(src);
          const destDir = join(MEDIA_DIR, slug);
          mkdirSync(destDir, { recursive: true });
          copyFileSync(src, join(destDir, fname));
          imageUrl = `log-media/${slug}/${fname}`;
        }
      }

      return {
        slug: eslug, title: ef.title || eslug, topic: slug,
        created: D(ef.created) || null, updated: updatedOf(ep, D(ef.created)),
        image: imageUrl,
        fields: out, body, links: wikiTargets(body),
      };
    });

    // 既定の並び順（display.sort）で entries を整列する
    const sb = display.sort.by, asc = display.sort.order === 'asc';
    if (sb) {
      const kv = (e) => (sb === 'created' ? e.created : e.fields[sb]);
      entries.sort((a, b) => {
        const av = kv(a), bv = kv(b);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av < bv ? -1 : av > bv ? 1 : 0) * (asc ? 1 : -1);
      });
    }

    return {
      slug, title: tf.title || slug, tags: tf.tags || [],
      created: D(tf.created) || null, imageVisibility: tf.image_visibility || 'public',
      fields, display, intro: tbody, links: wikiTargets(tbody), entries,
    };
  })
  .filter(Boolean);

// ---------- 検証結果 ----------
if (errors.length) {
  console.error('❌ build-data: スキーマ検証エラー\n' + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}

const site = { generatedAt: today, follows, notes, mocs, atlases, logtopics };
const json = JSON.stringify(site);

mkdirSync(OUT, { recursive: true });
// 平文と暗号文が同居しないようクリーンにする
for (const f of ['site.json', 'site.enc.json']) { const p = join(OUT, f); if (existsSync(p)) rmSync(p); }

const password = process.env.MN_SITE_PASSWORD;
if (password) {
  const salt = randomBytes(16), iv = randomBytes(12);
  const iters = 200000;
  const key = pbkdf2Sync(password, salt, iters, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const payload = {
    v: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iters, salt: salt.toString('base64') },
    iv: iv.toString('base64'),
    ct: Buffer.concat([ct, cipher.getAuthTag()]).toString('base64'), // ct||tag（WebCrypto互換）
  };
  writeFileSync(join(OUT, 'site.enc.json'), JSON.stringify(payload));
  console.log(`🔒 site.enc.json を出力（暗号化）。follows ${follows.length} / notes ${notes.length} / mocs ${mocs.length} / atlases ${atlases.length} / logs ${logtopics.length}`);
} else {
  writeFileSync(join(OUT, 'site.json'), json);
  console.log(`📄 site.json を出力（平文/dev）。follows ${follows.length} / notes ${notes.length} / mocs ${mocs.length} / atlases ${atlases.length} / logs ${logtopics.length}`);
}
