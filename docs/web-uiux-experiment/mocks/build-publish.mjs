#!/usr/bin/env node
// モック HTML を「単一ファイルで完結する公開用 HTML」に変換する。
//   - `<script src="mn-data.js"></script>` を実データのインライン展開に置き換える
//   - 先頭に Claude Design のカード指定コメント（@dsCard）を付ける
//   - 公開先の1ファイル上限に収めるため、本文抜粋（ex）だけを短く詰める
//     ※ タイトル・タグ・想起の問い・リンクの理由・数値は一切削らない（モックの説得力の本体なので）
// 出力: mocks/dist/<name>.html
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, 'dist');
// 実測: Claude Design への書き込みは 300KB 台でも通った（2026-07-31）。
// この閾値は「重くなってきたぞ」を知らせるだけの目安で、超えても止めない。
const LIMIT_KB = 320;
// 抜粋の最大文字数。小さくすると軽くなるが、記事プレビューの説得力が落ちる。
// タイトル・タグ・想起の問い・リンクの理由・観測値は何を指定しても削らない。
const EX_LIMIT = Number(process.argv[2]) || 240;

const raw = readFileSync(join(DIR, 'mn-data.js'), 'utf8');
const site = JSON.parse(raw.replace(/^\s*window\.MN\s*=\s*/, '').replace(/;\s*$/, ''));

// ex フィールドだけを再帰的に詰める
let trimmed = 0;
const slim = (v) => {
  if (Array.isArray(v)) return v.map(slim);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === 'ex' && typeof val === 'string' && val.length > EX_LIMIT) {
        o[k] = val.slice(0, EX_LIMIT) + '…';
        trimmed++;
      } else o[k] = slim(val);
    }
    return o;
  }
  return v;
};

const data = `window.MN = ${JSON.stringify(slim(site))};`;
console.log(`データ: ${Math.round(raw.length / 1024)} KB → ${Math.round(data.length / 1024)} KB（抜粋 ${trimmed} 件を ${EX_LIMIT} 字に）\n`);

const TARGETS = [
  { file: 'index.html',  group: '比較と審査',        title: 'muninn UIUX 実験｜3案の比較' },
  { file: 'mock-a.html', group: '案A 親指ひとつ',     title: 'muninn 案A｜親指ひとつ' },
  { file: 'mock-b.html', group: '案B 一本の欄',       title: 'muninn 案B｜一本の欄' },
  { file: 'mock-c.html', group: '案C 紙面をめくる',   title: 'muninn 案C｜紙面をめくる' },
];

// `<script src="mn-data.js">` の書き方の揺れ（属性順・引用符・パス表記）を吸収する
const SRC_TAG = /<script[^>]*\ssrc\s*=\s*["']\.?\/?mn-data\.js["'][^>]*>\s*<\/script>/i;

// 画面写真の埋め込み。`__IMG_A1__` 等のプレースホルダを data URI に置き換える
// （公開先は外部ホストを参照できないため、画像も1ファイルに畳み込む）
const SHOTS = join(DIR, '..', 'shots');
function inlineImages(html) {
  return html.replace(/__IMG_([A-C][0-9])__/g, function (m, key) {
    const p = join(SHOTS, `img-${key.toLowerCase()}.jpg`);
    if (!existsSync(p)) { console.warn(`  ⚠️  画像が無い: ${p}`); return ''; }
    return 'data:image/jpeg;base64,' + readFileSync(p).toString('base64');
  });
}

mkdirSync(OUT, { recursive: true });
let over = 0;

for (const t of TARGETS) {
  const src = join(DIR, t.file);
  if (!existsSync(src)) { console.warn(`  skip（未着）: ${t.file}`); continue; }
  let html = readFileSync(src, 'utf8');

  if (SRC_TAG.test(html)) {
    // </script> がデータ中に現れると script タグが途中で閉じるため必ずエスケープする
    html = html.replace(SRC_TAG, `<script>\n${data.replace(/<\/script/gi, '<\\/script')}\n</script>`);
  } else if (t.file !== 'index.html') {
    console.warn(`  ⚠️  ${t.file}: mn-data.js の読み込みタグが見つからない（インライン展開せず出力）`);
  }

  if (html.indexOf('__IMG_') >= 0) html = inlineImages(html);

  const outHtml = `<!-- @dsCard group="${t.group}" -->\n` + html;
  writeFileSync(join(OUT, t.file), outHtml);
  const kb = Math.round(Buffer.byteLength(outHtml) / 1024);
  if (kb > LIMIT_KB) over++;
  console.log(`  ${kb > LIMIT_KB ? '△' : '✓'} ${t.file} → dist/${t.file}（${kb} KB）`);
}

console.log(over
  ? `\n${over} 件が目安の ${LIMIT_KB}KB を超えた。軽くしたければ抜粋を詰める: node build-publish.mjs 110`
  : '\n全件が目安内。');
