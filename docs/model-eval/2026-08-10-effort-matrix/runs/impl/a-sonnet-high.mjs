/**
 * SRS (Spaced Repetition System) の状態を1回の復習結果に基づいて更新する純粋関数。
 *
 * @param {{ last: string | null, interval: number, ease: number }} srs
 * @param {number} quality - 0〜5 の整数
 * @param {string} today - "YYYY-MM-DD"
 * @returns {{ last: string, interval: number, ease: number, next: string }}
 */
export function updateSrs(srs, quality, today) {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError(`quality must be an integer in [0, 5], got: ${quality}`);
  }

  // §1 ease の更新（下限 1.3）
  const rawEase =
    srs.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const ease = Math.max(1.3, rawEase);

  // §2/§3 interval の更新
  let interval;
  if (quality < 3) {
    // §3: 不正解時は 1 にリセット
    interval = 1;
  } else if (srs.interval === 1) {
    interval = 6;
  } else if (srs.interval === 0) {
    // 仕様が明示しない「未復習（interval=0）」からの初回復習。
    // §6 の単調非減少を満たすため、SM-2 の n=1 相当として 1 を採用する。
    // 詳細は返答の「仕様について」を参照。
    interval = 1;
  } else {
    interval = Math.round(srs.interval * ease);
  }

  const last = today;
  const next = addDays(today, interval);

  return { last, interval, ease, next };
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
