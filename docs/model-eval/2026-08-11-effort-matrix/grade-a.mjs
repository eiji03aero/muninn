// タスクAの実装を機械採点する。
//   node grade-a.mjs
// runs/a-*.md から最初の ```js ブロックを取り出して runs/impl/<case>.mjs に書き、
// import して answer-key-a.md の確定テスト C1〜C8 と要判断テスト J1/J2 を実行する。

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KIT = dirname(fileURLToPath(import.meta.url));
const RUNS = join(KIT, 'runs');
const IMPL = join(RUNS, 'impl');
mkdirSync(IMPL, { recursive: true });

const EPS = 1e-9;

// --- 確定テスト（仕様から一意に決まる） ---
const CERTAIN = [
  { id: 'C1', srs: { last: '2026-08-01', interval: 1, ease: 2.5 }, q: 4, today: '2026-08-10',
    want: { interval: 6, ease: 2.5, next: '2026-08-16' } },
  { id: 'C2', srs: { last: '2026-08-01', interval: 6, ease: 2.5 }, q: 5, today: '2026-08-10',
    want: { interval: 16, ease: 2.6, next: '2026-08-26' } },
  { id: 'C3', srs: { last: '2026-08-01', interval: 10, ease: 1.3 }, q: 3, today: '2026-08-10',
    want: { interval: 13, ease: 1.3, next: '2026-08-23' } },
  { id: 'C4', srs: { last: '2026-08-01', interval: 6, ease: 2.5 }, q: 4, today: '2026-08-28',
    want: { interval: 15, ease: 2.5, next: '2026-09-12' } },
  { id: 'C5', srs: { last: '2028-02-19', interval: 1, ease: 2.5 }, q: 4, today: '2028-02-25',
    want: { interval: 6, ease: 2.5, next: '2028-03-02' } },
  { id: 'C8', srs: { last: '2026-08-01', interval: 10, ease: 1.44 }, q: 3, today: '2026-08-10',
    want: { interval: 13, ease: 1.3, next: '2026-08-23' } },
];

// --- 要判断テスト（仕込んだ欠陥に当たる。正解を問わず挙動を記録する） ---
const JUDGE = [
  { id: 'J1', srs: { last: null, interval: 0, ease: 2.5 }, q: 5, today: '2026-08-10' },
  { id: 'J2', srs: { last: '2026-08-01', interval: 10, ease: 2.5 }, q: 1, today: '2026-08-10' },
];

function extractCode(md) {
  const m = md.match(/```(?:js|javascript)\n([\s\S]*?)```/);
  if (!m) throw new Error('コードブロックが見つからない');
  return m[1];
}

function checkCertain(fn, t) {
  try {
    const got = fn(structuredClone(t.srs), t.q, t.today);
    const ok =
      got.interval === t.want.interval &&
      Math.abs(got.ease - t.want.ease) < EPS &&
      got.next === t.want.next &&
      got.last === t.today;
    return { ok, got };
  } catch (e) {
    return { ok: false, got: `throw: ${e.message}` };
  }
}

// C6: §5 の例外。4種すべてで throw して1点
function checkThrows(fn) {
  const bad = [6, 2.5, '4', NaN];
  const results = bad.map((q) => {
    try { fn({ last: null, interval: 1, ease: 2.5 }, q, '2026-08-10'); return false; }
    catch { return true; }
  });
  return { ok: results.every(Boolean), got: results.map((r, i) => `${JSON.stringify(bad[i])}:${r ? 'throw' : 'NO'}`).join(' ') };
}

// C7: 引数を破壊しない
function checkPure(fn) {
  const srs = { last: '2026-08-01', interval: 6, ease: 2.5 };
  const snapshot = JSON.stringify(srs);
  try { fn(srs, 4, '2026-08-10'); } catch { /* 例外は C6 で見る */ }
  const ok = JSON.stringify(srs) === snapshot;
  return { ok, got: ok ? 'unchanged' : JSON.stringify(srs) };
}

const cases = readdirSync(RUNS).filter((f) => /^a-.*\.md$/.test(f)).sort();
const summary = [];

for (const file of cases) {
  const name = file.replace(/\.md$/, '');
  let fn;
  try {
    const code = extractCode(readFileSync(join(RUNS, file), 'utf8'));
    const path = join(IMPL, `${name}.mjs`);
    writeFileSync(path, code);
    ({ updateSrs: fn } = await import(pathToFileURL(path).href));
    if (typeof fn !== 'function') throw new Error('updateSrs が export されていない');
  } catch (e) {
    console.log(`\n### ${name}\n  ロード失敗: ${e.message}`);
    summary.push({ name, pass: 0, detail: 'load failed' });
    continue;
  }

  console.log(`\n### ${name}`);
  let pass = 0;
  const failed = [];
  for (const t of CERTAIN) {
    const { ok, got } = checkCertain(fn, t);
    if (ok) pass++; else failed.push(`${t.id}(${JSON.stringify(got)})`);
    console.log(`  ${ok ? '✓' : '✗'} ${t.id}`);
  }
  for (const [id, r] of [['C6', checkThrows(fn)], ['C7', checkPure(fn)]]) {
    if (r.ok) pass++; else failed.push(`${id}(${r.got})`);
    console.log(`  ${r.ok ? '✓' : '✗'} ${id}  ${r.got}`);
  }

  const judged = JUDGE.map((t) => {
    try {
      const g = fn(structuredClone(t.srs), t.q, t.today);
      return `${t.id}: interval=${g.interval} next=${g.next}`;
    } catch (e) { return `${t.id}: throw(${e.message})`; }
  });
  judged.forEach((j) => console.log(`  · ${j}`));

  summary.push({ name, pass, detail: failed.join(' ') || '—', judged });
}

console.log('\n\n=== 確定テスト 集計（8点満点）===');
for (const s of summary) {
  console.log(`${s.name.padEnd(18)} ${String(s.pass).padStart(2)}/8   ${s.detail}`);
}
console.log('\n=== 要判断テストの挙動 ===');
for (const s of summary) {
  if (s.judged) console.log(`${s.name.padEnd(18)} ${s.judged.join('   |   ')}`);
}
