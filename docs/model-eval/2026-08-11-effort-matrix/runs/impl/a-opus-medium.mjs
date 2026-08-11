const MIN_EASE = 1.3;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * SM-2 系の間隔反復状態を更新する純粋関数。
 * 引数は破壊せず、常に新しいオブジェクトを返す。
 *
 * @param {{last: string|null, interval: number, ease: number}} srs
 * @param {number} quality 0〜5 の整数
 * @param {string} today 'YYYY-MM-DD'
 * @returns {{last: string, interval: number, ease: number, next: string}}
 */
export function updateSrs(srs, quality, today) {
  // §5 入力の妥当性
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError(
      `quality must be an integer between 0 and 5, got: ${String(quality)}`
    );
  }
  if (srs === null || typeof srs !== 'object') {
    throw new TypeError(`srs must be an object, got: ${String(srs)}`);
  }
  if (typeof today !== 'string' || !DATE_RE.test(today) || !isRealDate(today)) {
    throw new RangeError(`today must be a valid YYYY-MM-DD string, got: ${String(today)}`);
  }

  const prevInterval = Number.isFinite(srs.interval) ? Math.max(0, Math.trunc(srs.interval)) : 0;
  const prevEase = Number.isFinite(srs.ease) ? srs.ease : 2.5;

  // §1 ease の更新（成否によらず適用）
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const ease = Math.max(MIN_EASE, prevEase + delta);

  // §2 / §3 interval の更新
  let interval;
  if (quality < 3) {
    // §3 不正解: 1 にリセット（§6 より §3 を優先。理由は「仕様について」参照）
    interval = 1;
  } else if (prevInterval <= 1) {
    // interval === 1 → 6。未復習相当（0）も 1 → 6 の系列に乗せるため 1 とみなす。
    interval = prevInterval === 1 ? 6 : 1;
  } else {
    interval = Math.round(prevInterval * ease);
    // §6 単調非減少（成功時のみ保証。ease < 1.0 では起こらないが念のため）
    if (interval < prevInterval) interval = prevInterval;
  }

  return {
    last: today,
    interval,
    ease,
    next: addDays(today, interval), // §4
  };
}

function toUtcMs(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function isRealDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(toUtcMs(ymd));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

function addDays(ymd, days) {
  const dt = new Date(toUtcMs(ymd) + days * 86400000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(dt.getUTCFullYear(), 4)}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}
