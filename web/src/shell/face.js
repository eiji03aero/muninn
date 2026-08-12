// 面（読む面のかたち）の登録簿。
//
// 3つの面は**実験**であって恒久構成ではない（web/DESIGN.md §11）。増減が1箇所で済むよう、
// 面は「1コンポーネント＋メタ情報」としてここだけに書く。負けた面を消すときも、
// この配列から1行消して faces/<id>/ を rm するだけで終わる状態を保つこと。
//
// label / hint は**読者に見せる語**。`モードA` `案B` のような開発上の呼び名は画面に出さない。
// 画面に出すときの概念名は「画面のかたち」。`面` はコードとこの中だけの内部語彙にする
// （読者には日報タブの ▣面 と衝突して読めなかった。web/DESIGN.md §4）。
import { lazy } from 'react';
import { todayISO } from '../lib/recall.js';

const KEY_FACE = 'mn.face';
const KEY_USAGE = 'mn.face.usage';

// 面ごとに動的 import する。こうしておくと日報の Chakra が他の面のチャンクに混ざらず、
// 「日報を落とせば Chakra ごと消える」状態を保てる。
export const FACES = [
  {
    id: 'daily',
    label: '日報',
    hint: '今日の紙面を上から読み、下のタブで横に移る。いまのかたち',
    // この面は自前のルータで URL を書き換えながら動く。shell が hash を追いかけると
    // 面の移動のたびに shell まで再描画されるので、追わない。
    ownsUrl: true,
    Root: lazy(() => import('../faces/daily/index.jsx')),
  },
  {
    id: 'thumb',
    label: '親指ひとつ',
    hint: '左下の一点だけで操作する。上は読むだけ',
    ownsUrl: false,
    Root: lazy(() => import('../faces/thumb/index.jsx')),
  },
  {
    id: 'field',
    label: '一本の欄',
    hint: '下の欄に打つと中身が変わる。タブは無い',
    ownsUrl: false,
    Root: lazy(() => import('../faces/field/index.jsx')),
  },
];

export const DEFAULT_FACE = 'daily';

// 未知の値（消した面の id が localStorage に残っている等）は既定へ落とす。壊れない。
export const faceById = (id) =>
  FACES.find((f) => f.id === id) || FACES.find((f) => f.id === DEFAULT_FACE);

export function loadFaceId() {
  try { return faceById(localStorage.getItem(KEY_FACE)).id; } catch { return DEFAULT_FACE; }
}

export function saveFaceId(id) {
  try { localStorage.setItem(KEY_FACE, faceById(id).id); } catch { /* noop */ }
}

// ---- 面ごとの利用日数 ----
// 実験を終わらせる（1本に絞る）ときの唯一の客観データ。
// 「未消化の借金」ではなく**増えるカウンタ**なので出してよい（DESIGN.md 原則3）。
// 日付の配列ではなく件数＋最終日だけ持つ（容量が増え続けない）。
export function loadUsage() {
  try { return JSON.parse(localStorage.getItem(KEY_USAGE)) || {}; } catch { return {}; }
}

export function touchFace(id, today = todayISO()) {
  const usage = loadUsage();
  const cur = usage[id] || { days: 0, last: null, first: null };
  if (cur.last === today) return usage;
  const next = { days: cur.days + 1, last: today, first: cur.first || today };
  usage[id] = next;
  try { localStorage.setItem(KEY_USAGE, JSON.stringify(usage)); } catch { /* noop */ }
  return usage;
}
