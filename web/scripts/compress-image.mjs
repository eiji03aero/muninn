#!/usr/bin/env node
// ログ（logs/）に載せる画像を、リポジトリに置いてよいサイズまで圧縮する。
//
//   npm --prefix web run img -- <src> <dst> [--max=1280] [--quality=72]
//
// 原本（スマホ写真は 4000px 超・数MB）はコミットしない規約なので、必ずこれを通した
// 派生だけを logs/<topic>/images/ に置く。EXIF の向きを実ピクセルに焼き込むので、
// 横倒しで撮れた写真もサイトで正立する（回転情報を落とすビューアがあるため）。
//
// 出力形式は <dst> の拡張子で決まる（.webp 推奨 / .jpg も可）。
import sharp from 'sharp';
import { statSync, mkdirSync } from 'node:fs';
import { dirname, extname } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : def;
};
const [src, dst] = args.filter((a) => !a.startsWith('--'));

if (!src || !dst) {
  console.error('usage: npm --prefix web run img -- <src> <dst> [--max=1280] [--quality=72]');
  process.exit(1);
}

const max = opt('max', 1280);
const quality = opt('quality', 72);
const ext = extname(dst).toLowerCase();
if (!['.webp', '.jpg', '.jpeg'].includes(ext)) {
  console.error(`出力拡張子は .webp か .jpg にする（指定: ${ext || 'なし'}）`);
  process.exit(1);
}

mkdirSync(dirname(dst), { recursive: true });

const input = sharp(src, { failOn: 'error' });
const meta = await input.metadata();

const pipeline = input
  .rotate() // EXIF の向きをピクセルに反映（引数なし = auto-orient）
  .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true });

await (ext === '.webp'
  ? pipeline.webp({ quality, effort: 6 })
  : pipeline.jpeg({ quality, mozjpeg: true })
).toFile(dst);

const kb = (p) => Math.round(statSync(p).size / 1024);
const out = await sharp(dst).metadata();
console.log(
  `🖼  ${src} (${meta.width}x${meta.height}, ${kb(src)}KB)\n` +
  ` → ${dst} (${out.width}x${out.height}, ${kb(dst)}KB)`
);
