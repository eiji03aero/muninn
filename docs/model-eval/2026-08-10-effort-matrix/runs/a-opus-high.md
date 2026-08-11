## 実装

```js
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
```

## 仕様について

**1. §3 と §6 が正面から矛盾する（最重要）**

§3 は `quality < 3` で interval を 1 にリセットせよと言い、§6 は interval が単調非減少であることを要求する。`interval: 30` の状態で `quality: 1` を渡すと、§3 は 1 を、§6 は 30 以上を要求し、両立しない。

**採用した解釈: §3 を優先し、§6 は満たさない実装とした。** 理由は、失念時に間隔を畳んで再学習させることが間隔反復アルゴリズムの中核であり、§6 を優先すると「一度伸びた間隔は忘れても二度と縮まない」という、機能として壊れた挙動になるため。§3 は具体的な計算規則、§6 は事後的に付けられた一般則であり、両者が衝突する場合は具体則が意図を表していると読んだ。§6 は「正解し続ける限り interval は縮まない」という意図の記述ミスと解釈している（その範囲では、ease 下限が 1.3 ≥ 1 なので `round(interval * ease) ≥ interval` が成り立ち、実際に満たされる）。

**2. `interval === 0`（未復習状態）の扱いが未定義**

`last: null` の初回復習では `interval` は 0 のはずだが、§2 は `interval === 1` の場合と「それ以外」しか規定していない。「それ以外」に落とすと `round(0 * ease) === 0` となり、`next === today`（当日再出題）で以後ずっと 0 のまま固まる。

**採用した解釈: `interval <= 0` のときは新しい interval を 1 とした。** SM-2 の標準的な初回間隔であり、次回の復習で §2 の `interval === 1 → 6` に自然につながるため。

**3. `last` が計算にまったく使われない**

`last` は入力に含まれるが、§1〜§4 のどこでも参照されず、単に `today` で上書きされるだけである。予定日より大幅に遅れて復習した場合（遅延分を interval に反映する等）の扱いが仕様にない。**仕様どおり、`last` は計算に使わず `today` で置き換えるのみとした。**

**4. §5 の検証範囲が `quality` に限定されている**

`today` が不正な文字列（`"2026-13-45"`、`null` など）の場合の挙動が規定されていない。放置すると `Invalid Date` から `next` が `"Invalid Date"` を経て例外またはゴミ文字列になる。**`today` の形式・実在日チェックも例外にした**（§5 の趣旨の延長として、静かに壊れた値を返すより望ましいと判断）。`srs.interval` / `srs.ease` については仕様が型を保証しているものとして例外にはせず、欠損時は初期値（interval 0 相当、ease 2.5）にフォールバックさせている。

**5. 補足（矛盾ではないが明記しておく点）**

- `ease` は丸めずに実数のまま保持している（§1 に丸めの指示がないため）。frontmatter に書き出す際は浮動小数の桁が伸びうる。
- 日付演算は UTC 固定で行い、ローカルタイムゾーンや DST の影響を受けないようにしている。
