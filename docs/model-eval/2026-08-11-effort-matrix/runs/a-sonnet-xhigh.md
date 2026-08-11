## 実装

```js
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
```

## 仕様について

2点、仕様の隙間・矛盾を見つけたため、採用した解釈を明記する。

**1. §2 が `interval === 0`（未復習からの初回復習）を扱っていない**

§2 は「`interval === 1` → 6」「それ以外 → `interval * ease'` を四捨五入」の2ケースしか定義していない。しかし新規ノート（`last: null`）の初期 `interval` は 0 が自然な値であり、これを文字通り「それ以外」に当てはめると `round(0 * ease') = 0` となり、正解し続けても interval が 0 のまま増えない（＝毎日復習対象になり続ける）。これは SRS の目的（正解するほど間隔を空ける）に反する。
→ 標準的な SM-2 アルゴリズム（初回正解で interval=1、2回目正解で6、以降は ease 倍）に倣い、`interval === 0` の場合は 1 にする分岐を補った。

**2. §3（不正解時のリセット）と §6（interval の単調非減少）が矛盾する**

§3 は「`quality < 3` のとき interval を 1 にリセットする」と明記しており、これは直前の interval が大きい値（例: 30）であっても無条件で 1 に戻すことを意味する。一方 §6 は「interval は復習のたびに前回の値以上でなければならない」としており、この2つは復習が失敗した場合に両立し得ない。
→ SRS として意味を持たせるには「不正解時は早期に再復習させる」という §3 の挙動が本質的に必要であり、これを無視して §6 を字義通り守る（＝不正解でも interval を減らさない）と、忘れた項目を放置する壊れた復習システムになってしまう。そのため §3 を優先して実装し、§6 は「不正解を挟まない連続正解の範囲内で成り立つ性質」として限定的に解釈した（実際、正解が続く限り interval は §1/§2 の計算により狭義単調増加することを確認済み）。
