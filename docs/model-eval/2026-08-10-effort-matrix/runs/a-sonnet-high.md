## 実装

```js
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
```

## 仕様について

実装を止めずに進めたが、以下2点は仕様上の欠落・矛盾と判断し、解釈を採用した。

**1. `interval === 0`（未復習ノートの初回復習）のケースが§2に定義されていない。**
§2は `interval === 1 → 6` と `それ以外 → round(interval * ease')` の2分岐しか定めていない。しかし新規ノートの初期状態は `last: null` であり、`interval` は「非負整数」なので初期値は自然には `0` になる（`1` だと「初回なのにすでに1日隔たっている」ことになり不自然）。この状態を素直に「それ以外」に落とすと `round(0 * ease') = 0` となり、正解し続けても `interval` が永遠に `0` から動かないという明らかに意図しない挙動になる（§6の単調非減少は満たすが、SRSとして無意味）。
→ SM-2アルゴリズムの標準的な段階（n=1→interval=1, n=2→interval=6, n≥3→interval*EF）に倣い、`interval === 0` を「初回復習」として `interval === 1` と同様の特別扱いとし、新しい interval を `1` とした。

**2. §3（不正解時に interval を1にリセット）と§6（interval は単調非減少）が矛盾する。**
たとえば `interval = 30` の状態で `quality = 2` の復習をすると、§3により `interval` は `1` にリセットされ、これは明確に「前回の値未満」であり§6に反する。
→ SRSの一般的な仕様として「失敗したら間隔をリセットする」のは意図的な設計であり、§3の記述はそれを明示的に指示していると判断した。したがって §6 の単調非減少は「正解時（quality ≥ 3）の §2 の計算経路に対する健全性の保証」として解釈した（実際、`ease'` の下限が 1.3 であるため、正解時は `round(interval * ease') ≥ interval` が常に成り立ち、この経路では自然に単調非減少が保たれる）。不正解によるリセットはこの制約の対象外の、明示された例外的仕様として実装した。
