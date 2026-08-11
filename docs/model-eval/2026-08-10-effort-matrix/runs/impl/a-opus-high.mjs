// SM-2 ベースの SRS 状態更新（純粋関数）

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;
const MIN_EASE = 1.3;
const INITIAL_EASE = 2.5;

function parseDate(s, label) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) {
    throw new TypeError(`${label} must be a "YYYY-MM-DD" string, got: ${String(s)}`);
  }
  const [y, m, d] = s.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const dt = new Date(ms);
  // 2026-02-30 のような存在しない日付を弾く
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new RangeError(`${label} is not a valid calendar date: ${s}`);
  }
  return ms;
}

function formatDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * @param {{ last: string | null, interval: number, ease: number }} srs
 * @param {number} quality 0〜5 の整数
 * @param {string} today "YYYY-MM-DD"
 * @returns {{ last: string, interval: number, ease: number, next: string }}
 */
export function updateSrs(srs, quality, today) {
  if (srs == null || typeof srs !== 'object') {
    throw new TypeError('srs must be an object');
  }
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError(`quality must be an integer in 0..5, got: ${String(quality)}`);
  }

  const todayMs = parseDate(today, 'today');

  const prevEase = Number.isFinite(srs.ease) ? srs.ease : INITIAL_EASE;
  const prevInterval = Number.isFinite(srs.interval) ? Math.max(0, Math.trunc(srs.interval)) : 0;

  // §1 ease の更新（下限 1.3）
  const ease = Math.max(
    MIN_EASE,
    prevEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // §2 interval の更新
  // interval === 0（未復習 / 初回）は仕様が未定義。SM-2 に倣い 1 日とする。
  let interval;
  if (prevInterval <= 0) {
    interval = 1;
  } else if (prevInterval === 1) {
    interval = 6;
  } else {
    interval = Math.round(prevInterval * ease);
  }

  // §3 不正解（quality < 3）は interval を 1 にリセット。ease は §1 のまま。
  if (quality < 3) {
    interval = 1;
  }

  return {
    last: formatDate(todayMs),
    interval,
    ease,
    next: formatDate(todayMs + interval * MS_PER_DAY),
  };
}
