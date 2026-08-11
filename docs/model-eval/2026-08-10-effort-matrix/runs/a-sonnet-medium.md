## 実装

```js
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
```

## 仕様について

仕様に2点、曖昧・矛盾と判断した箇所があった。実装は止めず、以下の解釈を採用した。

**1. §2（`interval===1` → 6）と §3（`quality<3` → interval を 1 にリセット）の優先順位が未定義**

`interval === 1` かつ `quality < 3` のケースで、§2 を先に適用すると「6」になり、その後§3を適用すると再び「1」に戻る（結果は矛盾しない）。しかし §3 を先に適用してから §2 の条件（`interval===1`）を再チェックすると「6」になってしまい、不正解なのに interval が伸びるという矛盾が生じる。
→ **採用した解釈**: 「不正解ならインターバルを 1 にリセットする」という §3 の意図を優先し、`quality < 3` の場合は無条件で `interval = 1` とし、§2 の `interval===1` 分岐は評価しない（コード上も `quality < 3` を最初に判定）。不正解時に interval が伸びるのは SRS の設計として不自然なため。

**2. §6（単調非減少の不変条件）と §3（不正解時のリセット）が矛盾する**

`interval` が 6 以上の状態で不正解（`quality < 3`）になった場合、§3 により `interval = 1` となり、直前の値より減少する。これは §6 の「復習のたびに前回の値以上」という不変条件と真っ向から矛盾する。
→ **採用した解釈**: §6 の不変条件は「正解が続く連続復習列（`quality >= 3`）」に限定して成立するものとみなし、不正解時のリセットは §6 の対象外の特例として扱った（＝仕様通り §3 のリセットをそのまま実装）。この点は元の仕様設計者に確認したほうがよい矛盾だと考える。

なお、`interval` の初期値（未復習時、例えば `0`）についての特殊ケースは仕様に明記がなかったため、`interval===1` 以外はすべて `round(interval * ease')` の式をそのまま適用した（初回復習で `interval=0` かつ正解の場合、結果も `0` になる）。これが意図通りかは要確認。
