/**
 * @param {{ last: string | null, interval: number, ease: number }} srs
 * @param {number} quality - 0〜5 の整数
 * @param {string} today - "YYYY-MM-DD"
 * @returns {{ last: string, interval: number, ease: number, next: string }}
 */
export function updateSrs(srs, quality, today) {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError(`quality must be an integer in [0, 5], got: ${quality}`);
  }

  // §1: ease の更新（下限 1.3）
  const rawEase = srs.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const ease = Math.max(1.3, rawEase);

  // §2/§3: interval の更新
  let interval;
  if (quality < 3) {
    // §3: 不正解時は直前の interval によらず無条件で 1 にリセットする
    interval = 1;
  } else if (srs.interval === 0) {
    // 初回復習（未復習からの遷移）の扱いは §2 に明記がないため、
    // 標準的な SM-2 と同様に「0 -> 1」を補って解釈する（詳細は「仕様について」参照）
    interval = 1;
  } else if (srs.interval === 1) {
    interval = 6;
  } else {
    interval = Math.round(srs.interval * ease);
  }

  const last = today;
  const next = addDays(today, interval);

  return { last, interval, ease, next };
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMs = Date.UTC(y, m - 1, d) + days * 86400000;
  const result = new Date(utcMs);
  const yyyy = result.getUTCFullYear();
  const mm = String(result.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(result.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
