## 実装

```js
/**
 * SM-2 系の SRS 状態を 1 回の復習ぶん更新する純粋関数。
 * 引数は破壊せず、常に新しいオブジェクトを返す。
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86400000;
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

/** 'YYYY-MM-DD' を UTC のエポックミリ秒に変換する（DST の影響を避けるため UTC 固定）。 */
function parseDate(text) {
  if (typeof text !== 'string' || !DATE_RE.test(text)) {
    throw new TypeError(`date must be a 'YYYY-MM-DD' string, got: ${String(text)}`);
  }
  const [y, m, d] = text.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const dt = new Date(ms);
  // 2026-02-30 のような存在しない日付は Date.UTC が繰り上げてしまうので弾く
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new RangeError(`not a valid calendar date: ${text}`);
  }
  return ms;
}

/** UTC のエポックミリ秒を 'YYYY-MM-DD' に戻す。 */
function formatDate(ms) {
  const dt = new Date(ms);
  const y = String(dt.getUTCFullYear()).padStart(4, '0');
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @param {{ last: string | null, interval: number, ease: number }} srs
 * @param {number} quality 0〜5 の整数
 * @param {string} today 'YYYY-MM-DD'
 * @returns {{ last: string, interval: number, ease: number, next: string }}
 */
export function updateSrs(srs, quality, today) {
  // §5 入力の妥当性
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError(`quality must be an integer in 0..5, got: ${String(quality)}`);
  }
  const todayMs = parseDate(today); // 仕様外の追加ガード（下記「仕様について」4 参照）

  const { last = null, interval: prevInterval = 0, ease: prevEase = DEFAULT_EASE } = srs ?? {};

  // §1 ease の更新（下限 1.3）
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const ease = Math.max(MIN_EASE, prevEase + delta);

  // §2 §3 interval の更新
  let interval;
  if (quality < 3) {
    // §3 不正解: interval をリセット。ease は §1 のとおり更新済み
    interval = 1;
  } else if (prevInterval <= 0 || last === null) {
    // 未復習（interval 0）は §2 のどちらの枝でも進まないため、初回は 1 とする
    interval = 1;
  } else if (prevInterval === 1) {
    interval = 6;
  } else {
    interval = Math.round(prevInterval * ease); // §1 更新後の ease を使う
  }

  // §4 last / next
  return {
    last: today,
    interval,
    ease,
    next: formatDate(todayMs + interval * MS_PER_DAY),
  };
}
```

## 仕様について

問題を 4 点見つけた。

**1. §3 と §6 が真正面から矛盾する（最重要）**

§3 は `quality < 3` で interval を 1 にリセットせよと言い、§6 は interval が復習のたびに前回値以上であれ（単調非減少）と言う。interval 30 のノートを 1 にリセットすれば当然減少するので、両方を同時に満たすことはできない。両立させる唯一の解は「リセットを実質無効化する」ことだが、それは §3 を消すのと同じで、忘却時に間隔を縮めるという SRS の中核機能が失われる。

採用した解釈: **§3 を優先し、§6 は正答時（`quality >= 3`）にのみ課される不変条件と読んだ。** 理由は、§3 が具体的な振る舞いの規定であるのに対し §6 は事後的な性質の記述であり、衝突時は具体規定が勝つと考えるのが自然なため。またこの読み方なら §6 は §2 から自動的に従う（`interval === 1 → 6` は増加、それ以外は `ease >= 1.3` かつ `interval >= 2` より `round(interval * ease) >= interval`）ので、追加のクランプ処理は不要になる。逆に §6 を優先すると §3 が死に条文になり、仕様全体が壊れる。

**2. 初回復習（`interval === 0`）が §2 でカバーされていない**

未復習ノートは `last: null, interval: 0` のはずだが、§2 の分岐は `interval === 1` かそれ以外しかなく、0 は後者に落ちて `round(0 * ease) === 0` になる。つまり interval は 0 に張り付いたまま永久に増えず、`next` は常に `today`（毎日出題され続ける）。§6 には違反しないが、明らかに意図した動作ではない。

採用した解釈: **`interval <= 0` または `last === null` のとき、新しい interval を 1 とした。** SM-2 の標準的な進行（1 → 6 → ease 倍）に合わせると、§2 の `interval === 1 → 6` という規定がちょうど 2 回目の復習を意味することになり、仕様全体と整合するため。

**3. 不正解直後の 1 → 6 ジャンプ**

§3 でリセットされた interval 1 のノートは、次に正解すると §2 により ease と無関係に一律 6 日後になる。SM-2 の原典どおりではあるが、「ease は下がったのに間隔の回復は速い」という挙動なので意図的かどうか確認の余地がある。仕様どおり実装した（解釈による変更なし）。

**4. §5 の検証対象が `quality` だけ**

`today` が不正な文字列でも例外にならず、`next` が `"NaN-NaN-NaN"` になって frontmatter に書き込まれてしまう。純粋関数として黙って壊れた値を返すより早期に落ちるほうが安全と判断し、`today` の形式・実在日チェックを追加した（仕様にない振る舞いなので、不要なら `parseDate` の検証を外せばよい）。なお日付計算は UTC 固定にしてある。ローカルタイムで計算すると DST 切り替え日をまたぐときに 1 日ずれうるため。

補足（軽微）: ease に上限がなく、`quality: 5` を繰り返すと際限なく増える。また浮動小数点の誤差で `2.4000000000000004` のような値が frontmatter に書かれうる。§1 に丸め規定がないため実装では丸めていないが、YAML に永続化する以上は小数 2 桁への丸めを仕様に足すことを勧める。
