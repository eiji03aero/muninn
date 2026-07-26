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
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pbkdf2Sync, randomBytes, createCipheriv } from 'node:crypto';
import matter from 'gray-matter';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(WEB, '..');
const OUT = join(WEB, 'public');
const today = new Date().toISOString().slice(0, 10);

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
  const srs = data.srs || null;
  const next = srs ? D(srs.next) : null;
  const due = kind === 'knowledge' && next && String(next) !== 'null' && String(next) <= today;
  return {
    slug, title: data.title || slug, kind,
    tags: data.tags || [], created: D(data.created) || null,
    srs: srs ? { next: next ?? null, interval: srs.interval ?? 0 } : null,
    due: !!due, body, links: wikiTargets(body),
  };
});

// ---------- mocs ----------
const mocs = mdFiles(join(ROOT, 'moc')).map((p) => {
  const { data, body } = read(p);
  return { slug: slugOf(p), title: data.title || slugOf(p), tags: data.tags || [], body, links: wikiTargets(body) };
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

    const sessions = mdFiles(join(dir, 'sessions'))
      .map((sp) => { const { data, body } = read(sp); const d = D(data.date) || slugOf(sp); return { date: d, title: d, body }; })
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      name: d.name, title: pf.title || d.name, followType,
      status: pf.status || 'active', goal: pf.goal || '', tags: pf.tags || [],
      coach: pf.coach || null, formation: pf.formation || null,
      snapshot: pf.snapshot || [], rivals: pf.rivals || [],
      nextMatches: (pf.next_matches || []).map((m) => ({ ...m, date: D(m.date) })),
      body: pbody, links: wikiTargets(pbody), entities, sessions,
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
        status: data.status || 'written',
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

// ---------- 検証結果 ----------
if (errors.length) {
  console.error('❌ build-data: スキーマ検証エラー\n' + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}

const site = { generatedAt: today, follows, notes, mocs, atlases };
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
  console.log(`🔒 site.enc.json を出力（暗号化）。follows ${follows.length} / notes ${notes.length} / mocs ${mocs.length} / atlases ${atlases.length}`);
} else {
  writeFileSync(join(OUT, 'site.json'), json);
  console.log(`📄 site.json を出力（平文/dev）。follows ${follows.length} / notes ${notes.length} / mocs ${mocs.length} / atlases ${atlases.length}`);
}
