// shell が握る URL の契約。
//
// 面ごとにナビゲーションの流儀が違う（日報はルータ7本、面Aは方向、面Bは遷移そのものが無い）ので、
// 共通のルータを全面に強制できない。そこで shell が握るのは**2つだけ**にする:
//
//   1. /settings          — どの面が選ばれていても開ける非常口
//   2. 対象のディープリンク — /note/:slug など。面が変わっても URL が生き続ける契約
//
// それ以外の画面内の移動は各面の自由（URL に出す/出さないも面が決める）。

export const SETTINGS_PATH = '/settings';

export function currentPath() {
  const raw = (window.location.hash || '').replace(/^#/, '');
  if (!raw) return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export const setPath = (path) => { window.location.hash = path.startsWith('/') ? path : `/${path}`; };

// ディープリンクの形。**パスがそのまま graph の route になる**ように揃えてあるので、
// 面は graph.byRoute.get(target.route) で対象そのものを引ける。
const PATTERNS = [
  [/^\/note\/([^/]+)$/, 'note'],
  [/^\/follow\/([^/]+)$/, 'follow'],
  [/^\/follow\/([^/]+)\/player\/([^/]+)$/, 'entity'],
  [/^\/atlas\/([^/]+)$/, 'atlas'],
  [/^\/atlas\/([^/]+)\/concept\/([^/]+)$/, 'concept'],
  [/^\/log\/([^/]+)$/, 'logtopic'],
  [/^\/log\/([^/]+)\/entry\/([^/]+)$/, 'logentry'],
];

export function parseTarget(path) {
  const clean = (path || '').split('?')[0].replace(/\/+$/, '') || '/';
  for (const [re, kind] of PATTERNS) {
    const m = clean.match(re);
    if (m) return { route: clean, kind, slug: m[m.length - 1] };
  }
  return null;
}
