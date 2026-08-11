/**
 * @param {{ last: string | null, interval: number, ease: number }} srs
 * @param {number} quality - integer 0-5
 * @param {string} today - "YYYY-MM-DD"
 * @returns {{ last: string, interval: number, ease: number, next: string }}
 */
export function updateSrs(srs, quality, today) {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new Error(`quality must be an integer in [0, 5], got: ${quality}`);
  }

  // §1: ease の更新（下限 1.3）
  const rawEase =
    srs.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const newEase = Math.max(1.3, rawEase);

  // §3 が §2 の interval===1 特殊ケースより優先する解釈
  // （不正解時は無条件で interval を 1 にリセット）
  let newInterval;
  if (quality < 3) {
    newInterval = 1;
  } else if (srs.interval === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(srs.interval * newEase);
  }

  // §4: last / next
  const newLast = today;
  const newNext = addDays(today, newInterval);

  return {
    last: newLast,
    interval: newInterval,
    ease: newEase,
    next: newNext,
  };
}

/**
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {number} days
 * @returns {string} "YYYY-MM-DD"
 */
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  // UTC を使い DST の影響を受けないようにする
  const base = Date.UTC(y, m - 1, d);
  const result = new Date(base + days * 86400000);
  const yyyy = result.getUTCFullYear();
  const mm = String(result.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(result.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
