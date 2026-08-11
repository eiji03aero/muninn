/**
 * SM-2 系の SRS 状態を 1 回の復習ぶん更新する純粋関数。
 * 引数は破壊せず、常に新しいオブジェクトを返す。
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86400000;
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

/** 'YYYY-MM-DD' を UTC のエポックミリ秒に変換する（DST の影響を避けるため UTC 固定）。 */
function parseDate(text) {
  if (typeof text !== 'string' || !DATE_RE.test(text)) {
    throw new TypeError(`date must be a 'YYYY-MM-DD' string, got: ${String(text)}`);
  }
  const [y, m, d] = text.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const dt = new Date(ms);
  // 2026-02-30 のような存在しない日付は Date.UTC が繰り上げてしまうので弾く
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new RangeError(`not a valid calendar date: ${text}`);
  }
  return ms;
}

/** UTC のエポックミリ秒を 'YYYY-MM-DD' に戻す。 */
function formatDate(ms) {
  const dt = new Date(ms);
  const y = String(dt.getUTCFullYear()).padStart(4, '0');
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @param {{ last: string | null, interval: number, ease: number }} srs
 * @param {number} quality 0〜5 の整数
 * @param {string} today 'YYYY-MM-DD'
 * @returns {{ last: string, interval: number, ease: number, next: string }}
 */
export function updateSrs(srs, quality, today) {
  // §5 入力の妥当性
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError(`quality must be an integer in 0..5, got: ${String(quality)}`);
  }
  const todayMs = parseDate(today); // 仕様外の追加ガード（下記「仕様について」4 参照）

  const { last = null, interval: prevInterval = 0, ease: prevEase = DEFAULT_EASE } = srs ?? {};

  // §1 ease の更新（下限 1.3）
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const ease = Math.max(MIN_EASE, prevEase + delta);

  // §2 §3 interval の更新
  let interval;
  if (quality < 3) {
    // §3 不正解: interval をリセット。ease は §1 のとおり更新済み
    interval = 1;
  } else if (prevInterval <= 0 || last === null) {
    // 未復習（interval 0）は §2 のどちらの枝でも進まないため、初回は 1 とする
    interval = 1;
  } else if (prevInterval === 1) {
    interval = 6;
  } else {
    interval = Math.round(prevInterval * ease); // §1 更新後の ease を使う
  }

  // §4 last / next
  return {
    last: today,
    interval,
    ease,
    next: formatDate(todayMs + interval * MS_PER_DAY),
  };
}
