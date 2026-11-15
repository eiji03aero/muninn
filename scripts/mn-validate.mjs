#!/usr/bin/env node
// muninn validate — 正本 markdown の整合性チェック（依存ゼロ / Node標準のみ）。
//
// 使い方:
//   node scripts/mn-validate.mjs              # リポジトリ全体
//   node scripts/mn-validate.mjs <path> ...   # 指定ファイルだけ（エージェント出力の受け入れ検査用）
//
// 見るのは「あとで静かに壊れるもの」だけ:
//   - kind ごとの必須 frontmatter（knowledge の recall / srs 付け忘れ＝サイトが degrade 表示に落ちる）
//   - concept の型付きエッジの参照先が同じアトラス内に実在するか（web/build が落ちる条件）
//   - concept の notes: が実在する原子ノートを指しているか
//   - 本文の [[リンク]] が解決できるか（壊れリンク）
// 文章の質は見ない。質は人間とレビューの仕事。
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

const mdIn = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => join(dir, f)) : [];
const dirsIn = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory()) : [];
const slug = (p) => basename(p, '.md');

// frontmatter を緩くパースする（kind/notes/edges/recall/srs を拾えれば十分）。
function parse(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { fm: {}, edges: {}, body: text };
  let end = lines.indexOf('---', 1);
  if (end < 0) end = lines.length;
  const fm = {};
  const edges = {};
  let section = null;
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^(\s*)([A-Za-z_-]+):\s*(.*)$/);
    if (!m) continue;
    const [, indent, key, raw] = m;
    const val = raw.trim();
    if (indent === '') {
      section = val === '' ? key : null;
      fm[key] = val;
      continue;
    }
    if (section === 'edges') edges[key] = val;
    else if (section === 'srs') fm[`srs.${key}`] = val;
  }
  return { fm, edges, body: lines.slice(end + 1).join('\n') };
}
const list = (val) =>
  (val || '').replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
const wikiTargets = (body) =>
  [...new Set([...body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1].trim()))];

// ---- リンク解決用の索引（web/src/lib/wiki.js の resolveTarget に合わせる）----
const index = new Set();
const addAll = (paths) => paths.forEach((p) => index.add(slug(p)));
addAll(mdIn(join(ROOT, 'notes')));
addAll(mdIn(join(ROOT, 'moc')));
addAll(mdIn(join(ROOT, 'writings', 'pieces')));
for (const d of dirsIn(join(ROOT, 'atlas'))) {
  index.add(d);
  addAll(mdIn(join(ROOT, 'atlas', d, 'concepts')));
}
for (const d of dirsIn(join(ROOT, 'follows'))) {
  index.add(d);
  addAll(mdIn(join(ROOT, 'follows', d, 'entities')));
}
for (const d of dirsIn(join(ROOT, 'logs'))) {
  index.add(d);
  addAll(mdIn(join(ROOT, 'logs', d, 'entries')));
}
const noteSlugs = new Set(mdIn(join(ROOT, 'notes')).map(slug));
const resolves = (t) => index.has(t) || (t.includes('/') && index.has(t.split('/')[0]));

// ---- 検査対象（引数が無ければ notes/ と atlas/ の全ファイル）----
const argv = process.argv.slice(2);
const targets = argv.length
  ? argv.map((p) => resolve(p))
  : [
      ...mdIn(join(ROOT, 'notes')),
      ...dirsIn(join(ROOT, 'atlas')).flatMap((d) => [
        join(ROOT, 'atlas', d, 'atlas.md'),
        ...mdIn(join(ROOT, 'atlas', d, 'concepts')),
      ]),
    ].filter(existsSync);

for (const path of targets) {
  const file = relative(ROOT, path);
  const { fm, edges, body } = parse(path);
  const kind = fm.kind;
  if (!fm.title) fail(file, 'title が無い');
  if (!kind) fail(file, 'kind が無い');

  if (kind === 'knowledge') {
    // recall 欠落はサイトが degrade 表示に落ちる（web/DESIGN.md §9）
    if (!fm.recall) fail(file, 'kind: knowledge なのに recall が無い（想起カードが degrade する）');
    if (fm['srs.next'] === undefined) fail(file, 'kind: knowledge なのに srs.next が無い（クイズに出てこない）');
  }
  if ((kind === 'insight' || kind === 'concept' || kind === 'atlas') && fm['srs.next'] !== undefined)
    fail(file, `kind: ${kind} に srs が付いている（クイズ対象外のはず）`);

  if (kind === 'concept') {
    const atlasDir = dirname(dirname(path));
    const siblings = new Set(mdIn(join(atlasDir, 'concepts')).map(slug));
    for (const type of ['requires', 'contrasts', 'leads-to', 'elaborates'])
      for (const t of list(edges[type]))
        if (!siblings.has(t)) fail(file, `edges.${type} の参照先がアトラス内に無い: ${t}`);
    for (const n of list(fm.notes))
      if (!noteSlugs.has(n)) fail(file, `notes: の参照先が notes/ に無い: ${n}`);
    if (!['written', 'stub'].includes(fm.status)) fail(file, `status が written/stub ではない: ${fm.status}`);
  }

  for (const t of wikiTargets(body)) if (!resolves(t)) fail(file, `壊れリンク: [[${t}]]`);
}

const scope = argv.length ? `${targets.length} ファイル` : `notes/ と atlas/（${targets.length} ファイル）`;
if (problems.length) {
  console.error(`NG — ${scope} を検査して ${problems.length} 件:\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`OK — ${scope} に問題なし`);
