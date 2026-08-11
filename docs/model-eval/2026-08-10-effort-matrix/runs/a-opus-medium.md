## 実装

```js
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
```

## 仕様について

**問題1: §3 と §6 が矛盾する（本質的な矛盾）**

§3 は `quality < 3` のとき interval を 1 にリセットせよと言う。しかし §6 は interval が復習のたびに単調非減少であることを要求する。例えば `interval: 30` の状態で不正解になると、§3 に従えば 30 → 1 で減少し、§6 に違反する。両方を同時に満たすことはできない。

採用した解釈: **§3 を優先し、§6 は成功時（`quality >= 3`）のみの不変条件として扱った。** 理由は、§3 が具体的な計算規則であり、間隔反復アルゴリズムとして失敗時のリセットは機能の中核だから。§6 を優先して「リセット後も前回値以上」とすると §3 が完全に無効化され、忘れたカードが数十日先に再出題されるという、そもそも復習システムとして成立しない挙動になる。§6 は「順調に復習を重ねている限り間隔は縮まない」という意図の記述だと読んだ。

**問題2: 未復習（`last: null`）状態の interval が定義されていない**

`last === null` のときの interval は「非負整数」としか規定されず、通常 0 である。§2 の規則をそのまま当てはめると `round(0 * ease) = 0` となり、interval は永久に 0 のまま、`next` も常に `today` と等しくなって前に進まない。

採用した解釈: **`interval <= 0` は初回復習とみなし、成功時の新しい interval を 1 とした。** これにより 1 → 6 → 6×ease… という §2 の系列に自然に接続し、§6（0 → 1 は増加）も満たす。SM-2 の標準的な初期挙動とも一致する。

**問題3（軽微）: `interval === 1` の分岐が quality に依存しない書き方になっている**

§2 は「`interval === 1` のとき新しい interval は 6」と無条件に書かれているが、§3 の不正解時リセットと組み合わせると、不正解の直後（interval = 1）に再び不正解になった場合、§2 を先に適用すると 6 になってしまう。§3 を後段の上書きとして適用（＝実装では `quality < 3` を先に判定）し、不正解時は常に 1 になるようにした。

**補足:** §2 の「四捨五入」は `Math.round`（.5 は上へ）とした。日付演算は UTC 基準で行い、タイムゾーンによる日付ずれを排除している。
