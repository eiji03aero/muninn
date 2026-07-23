#!/usr/bin/env node
// muninn status — 復習期限・アクティブなフォロー・最近の観測を一覧するダッシュボード。
// 依存ゼロ（Node標準のみ）。使い方: node scripts/mn-status.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);

// 先頭の --- ... --- フロントマターを緩くパースする（必要フィールドのみ）。
function frontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return {};
  const fm = { srs: {} };
  let inSrs = false;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') break;
    const m = line.match(/^(\s*)([A-Za-z_]+):\s*(.*)$/);
    if (!m) continue;
    const [, indent, key, rawVal] = m;
    const val = rawVal.replace(/\s*#.*$/, '').trim(); // 行末コメント除去
    if (key === 'srs' && indent === '') { inSrs = true; continue; }
    if (inSrs && indent.length > 0) { fm.srs[key] = val; continue; }
    inSrs = false;
    fm[key] = val;
  }
  return fm;
}

function mdFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => join(dir, f));
}

// --- notes/ を走査 ---
const notes = mdFiles(join(ROOT, 'notes')).map((p) => ({ p, fm: frontmatter(readFileSync(p, 'utf8')) }));
const byKind = (k) => notes.filter((n) => (n.fm.kind || 'knowledge') === k);
const knowledge = byKind('knowledge');
const insight = byKind('insight');
const due = knowledge
  .filter((n) => n.fm.srs?.next && n.fm.srs.next !== 'null' && n.fm.srs.next <= today)
  .sort((a, b) => (a.fm.srs.next < b.fm.srs.next ? -1 : 1));

// --- follows/ を走査 ---
const followsDir = join(ROOT, 'follows');
const follows = (existsSync(followsDir) ? readdirSync(followsDir, { withFileTypes: true }) : [])
  .filter((d) => d.isDirectory())
  .map((d) => {
    const dir = join(followsDir, d.name);
    const profPath = join(dir, 'profile.md');
    const fm = existsSync(profPath) ? frontmatter(readFileSync(profPath, 'utf8')) : {};
    const sessions = mdFiles(join(dir, 'sessions')).map((p) => p.split('/').pop().replace('.md', '')).sort();
    const entities = mdFiles(join(dir, 'entities')).length;
    return { name: d.name, type: fm.follow_type || '?', status: fm.status || 'active', last: sessions.at(-1) || null, entities };
  });
const totalEntities = follows.reduce((s, f) => s + f.entities, 0);

// --- 出力 ---
const L = [];
L.push(`\n  muninn status — ${today}\n`);
L.push(`  📚 notes: ${notes.length}  (knowledge ${knowledge.length} / insight ${insight.length})`);
L.push(`  🔁 復習期限 (next <= ${today}): ${due.length} 件`);
for (const n of due.slice(0, 10)) {
  L.push(`       - ${n.p.split('/').pop().replace('.md', '')}  (next ${n.fm.srs.next})`);
}
if (due.length > 10) L.push(`       … 他 ${due.length - 10} 件`);
if (due.length) L.push(`     → /mn-review でクイズ`);
L.push('');
L.push(`  🎯 follows: ${follows.filter((f) => f.status === 'active').length} active / ${follows.length} total  (entities ${totalEntities})`);
for (const f of follows) {
  L.push(`       - ${f.name} [${f.type}/${f.status}] — 最新観測 ${f.last || 'なし'}${f.entities ? `, entities ${f.entities}` : ''}`);
}
L.push('');
console.log(L.join('\n'));
