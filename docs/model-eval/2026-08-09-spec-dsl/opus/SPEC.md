# FSPEC 1.0 — 機能仕様記述言語 仕様書

> 対象読者: この言語で仕様を書く AI、パーサ／コンパイラ／ランタイムの実装者、
> および仕様をレビューする人間。

---

## 1. 位置づけと設計原則

FSPEC は、上流要件と下流設計のあいだにある **「仕様」レイヤー** だけを担当する言語である。

```
要件(REQ)  →  【FSPEC 仕様】  →  基本設計  →  詳細設計  →  実装
   ↑              │                │
   └─ traces ─────┘                └─ WORKFLOW.md の導出規則で機械生成
```

### 1.1 設計原則

| # | 原則 | 言語上の帰結 |
|---|------|-------------|
| P1 | **単一定義原則 (SSOT)** | 制約は `rule` としてのみ書ける。`feature` は制約を再掲できない（構文上不可能）。 |
| P2 | **導出可能なものは書かない** | `reads` / `writes` / エラー一覧 / 遷移トリガ / 影響範囲はコンパイラが導出する。手書き禁止。 |
| P3 | **決定論** | 式言語は全域・副作用なし・順序非依存。浮動小数点なし。時刻・乱数は環境から注入。 |
| P4 | **網羅性は検査可能** | 静的検査 C-01〜C-27（§10）が「書き漏れ」を機械的に検出する。 |
| P5 | **参照はすべてグラフの辺** | 全ノードに安定 ID があり、参照関係が型付き有向グラフになる。影響追跡はグラフ演算。 |
| P6 | **自然言語は非規範** | `doc:` は人間のための注釈であり、いかなる導出にも使われない。`doc:` に書かれた制約は存在しないものとして扱う。 |
| P7 | **設計判断は含めない** | 画面・API・DB・トランザクション境界は仕様レイヤーに書かない（§14 参照）。 |

### 1.2 ファイル構成

- 拡張子 `.fspec`、UTF-8、LF 改行。
- 1 ファイル = 1 モジュール。ファイル名とモジュール名は一致させる（検査 C-01）。
- コンパイル成果物は **FSPEC IR**（正規化 JSON、§12）。ランタイムは IR のみを読む。

---

## 2. 字句構造

規範的な字句・構文定義は [`grammar.ebnf`](./grammar.ebnf) にある。ここでは要点のみ。

### 2.1 改行はエントリ区切り

ブロック `{ ... }` の中身は **改行区切り** のエントリ列である。以下の改行は「継続」として無視される。

- 直前のトークンが二項/単項演算子、`,`、`:`、`->`、`=>`
- `(` または `[` が閉じていない位置
- 直後の最初のトークンが二項演算子、`,`、`)`、`]`

`{` `}` は改行を抑止しない。セミコロンは存在しない。

### 2.2 リテラル

| 種類 | 例 | 備考 |
|------|-----|------|
| 整数 | `42`, `1_000` | |
| 小数 | `0.5000` | 10 進固定小数。2 進浮動小数は存在しない。 |
| 文字列 | `"Asia/Tokyo"` | |
| 金額 | `3000 JPY`, `0 JPY` | 数値の直後（同一行）に 3 大文字通貨コード。 |
| 期間 | `PT24H`, `P30D`, `PT1H30M` | ISO 8601。**年 `Y` と月 `M`(日付側) は禁止**（長さが不定で非決定的）。 |
| 時刻点 | `2026-05-01T10:00:00+09:00` | オフセット必須。 |
| 日付 | `2026-05-01` | |
| 時刻 | `03:00` | |
| 真偽 / null | `true`, `false`, `null` | |

### 2.3 コメント

`// 行末まで` と `/* ブロック */`（入れ子不可）。コメントは IR に載らない。

---

## 3. モジュールと名前解決

```fspec
module reservation

import identity
import catalog as cat
```

- **識別子はモジュール内で宣言種別を跨いで一意** でなければならない（検査 C-02）。
  `R_foo` と `F_foo` の共存は可、`rule R_x` と `feature R_x` の共存は不可。
- 参照は `IDENT`（同一モジュール）または `module.IDENT`（他モジュール）。
  `import ... as` で別名を付けられる。
- 循環 import は禁止（検査 C-03）。**ただしノード間の相互参照は循環してよい**。
  循環する関心事は上位モジュール（例: `policy`）に置く。
- 完全修飾 ID は `<module>.<ident>`。これが IR におけるノードの安定キーである。

### 3.1 推奨命名規約（検査 C-04 は警告レベル）

| 種別 | 接頭辞 | 例 |
|------|--------|-----|
| requirement | `REQ_` | `REQ_07` |
| param | `P_` | `P_cancel_free_window` |
| rule | `R_` | `R_no_double_booking` |
| derive | `D_` | `D_late_cancel_fee` |
| feature | `F_` | `F_cancel_reservation` |
| job | `J_` | `J_close_billing_period` |
| event | `Ev_` | `Ev_reservation_created` |
| error | `E_` | `E_ROOM_CONFLICT`（エラーのみ全大文字） |
| capability | `C_` | `C_override_conflict` |
| scope | `S_` | `S_own` |
| lifecycle | `L_` | `L_reservation` |
| transition | `T_` | `T_cancel` |
| scenario | `SC_` | `SC_late_cancel_charges_fee` |

エンティティ・列挙・アクタは `UpperCamel`、フィールドは `lower_snake`。

---

## 4. 型システム

### 4.1 スカラ型

| 型 | 意味 | 備考 |
|----|------|------|
| `Text` | Unicode 文字列 | |
| `Int` | 任意精度整数 | |
| `Decimal(s)` | 10 進固定小数（小数点以下 s 桁） | |
| `Rational` | 厳密有理数 | **中間計算専用**。フィールド型・derive の戻り型には使えるが、エンティティのフィールドには使えない（検査 C-05）。 |
| `Money` | 通貨コード + 最小単位精度の 10 進数 | JPY は小数 0 桁。異通貨の演算は型エラー。 |
| `Bool` | 真偽 | |
| `Instant` | UTC 絶対時刻 | |
| `Date` | 暦日（タイムゾーン非依存の日付） | |
| `Time` | 時刻（日付なし） | |
| `Duration` | 固定長期間（週/日/時/分/秒のみ） | |
| `Timezone` | IANA タイムゾーン名 | |
| `Actor` | 宣言済み `actor` の集合を値域とする組込み列挙 | `actor` 宣言から自動生成 |
| `Capability` | 宣言済み `capability` の集合を値域とする組込み列挙 | 自動生成 |
| `RoundingMode` | `HALF_UP` `HALF_EVEN` `DOWN` `UP` `CEILING` `FLOOR` | 組込み列挙 |

### 4.2 複合型

| 型 | 意味 |
|----|------|
| `Id<E>` | エンティティ `E` の主キー値 |
| `Ref<E>` | `E` への参照。値としては `Id<E>` と同一で、`.` によりフィールドへ自動デリファレンスされる。 |
| `List<T>` | 順序を意味に持たない有限多重集合（表示順は設計レイヤーの関心事） |
| `Interval<T>` | 半開区間 `[start, end)`。`T` は `Instant` / `Date` |
| `State<L>` | ライフサイクル `L` の状態を値域とする列挙 |
| `T?` | 省略可能。`null` を含む |

### 4.3 型変換

暗黙変換は以下のみ。それ以外はすべて明示関数が必要。

- `Int` → `Decimal(s)` → `Rational`
- `Id<E>` ↔ `Ref<E>`
- `Money` × `Rational` → `Rational`（金額の厳密値。フィールドに格納するには `round_money` が必須）
- `T` → `T?`

**浮動小数点数は言語に存在しない。** `/` の結果は常に `Rational`（厳密）であり、
`Money` や `Decimal(s)` に落とすには `round_money` / `round` を明示的に呼ぶ必要がある（検査 C-06）。
これにより「丸め方が実装依存で結果がずれる」を構文上排除する。

### 4.4 エンティティ外延

式の中でエンティティ名（`Reservation`）を単独で書くと、
**そのエンティティの全インスタンス集合（外延）** を表す `List<Ref<E>>` になる。
`Reservation["res-1"]` は主キー索引アクセス。

外延参照は `rule` / `feature.effect` / `feature.value` / `job.effect` / `scenario` の中でのみ許される。
`derive` の中では禁止（検査 C-07）。derive は純関数でなければならない。

---

## 5. 式言語

### 5.1 演算子

優先順位（低→高）: `=>` / `or` / `and` / `not` / 比較 / `+ -` / `* /` / 単項`-` / 後置`. ( ) [ ]`

- `or` `and` は **左からの短絡評価**。これにより `x == null or x.f > 0` が安全に書ける。
- 比較演算子は非結合（`a < b < c` は構文エラー）。
- `a in b` : `b` が `List<T>` のときメンバシップ。
- `a overlaps b` : `Interval` 同士。半開区間の共通部分が空でない。
- `a contains b` : `Interval` が点または区間を含む。
- `p => q` : 含意（`not p or q`）。不変条件を書くときに使う。

### 5.2 内包表記と量化子

```fspec
[ r.charge for r in Reservation where r.status == Confirmed ]

exists r in Reservation where r.room == self.room
forall r in active satisfies r.period.end > ctx.now
forall r in active where r.status == Confirmed satisfies r.period.end > ctx.now
```

- `exists v in S where F satisfies B` ≡ `∃v∈S. (F ∧ B)`
- `forall v in S where F satisfies B` ≡ `∀v∈S. (F → B)`（空集合で真）
- 量化子・内包表記の評価は要素順に依存してはならない。要素順に依存する組込み関数は提供しない（§5.3）。

### 5.3 組込み関数（全域・純粋・決定的）

| 関数 | 型 | 備考 |
|------|-----|------|
| `count(l)` | `List<T> -> Int` | |
| `sum(l)` | `List<Money\|Int\|Decimal\|Rational> -> 同型` | 空リストは 0 |
| `min(l)` / `max(l)` | `List<T> -> T?` | 空リストは `null` |
| `min(a,b)` / `max(a,b)` | `(T,T) -> T` | |
| `any(l)` / `all(l)` | `List<Bool> -> Bool` | |
| `the(l)` | `List<T> -> T` | 要素数がちょうど 1 でなければ実行時エラー `E_SPEC_VIOLATION` |
| `coalesce(a, b)` | `(T?, T) -> T` | |
| `abs(x)` | 数値 → 同型 | |
| `rational(a, b)` | `(Int, Int) -> Rational` | `b == 0` は実行時エラー |
| `round(x, scale, mode)` | `(Rational, Int, RoundingMode) -> Decimal(scale)` | |
| `round_money(x, mode)` | `(Rational-Money, RoundingMode) -> Money` | 通貨の最小単位に丸める |
| `interval(a, b)` | `(T, T) -> Interval<T>` | `a <= b` 必須 |
| `duration(iv)` | `Interval<Instant> -> Duration` | |
| `seconds(d)` / `minutes(d)` / `hours(d)` | `Duration -> Int` | 切り捨てなし。割り切れない場合は `rational` を使う |
| `date_of(t, tz)` | `(Instant, Timezone) -> Date` | |
| `time_of(t, tz)` | `(Instant, Timezone) -> Time` | |
| `instant_at(d, tm, tz)` | `(Date, Time, Timezone) -> Instant` | 存在しない/曖昧なローカル時刻は §5.5 の規則で解決 |
| `days_between(a, b)` | `(Date, Date) -> Int` | `b - a`。負値あり |
| `add_days(d, n)` | `(Date, Int) -> Date` | |
| `add_months(d, n)` | `(Date, Int) -> Date` | 月末クランプ（1/31 +1M = 2/28 or 2/29） |
| `text(x)` | `T -> Text` | 各型の正規表現形式（§12.4）。表示用ではない |
| `has(cap)` | `Capability -> Bool` | `ctx.capabilities` に含まれるか |

`+` / `-` は `Instant ± Duration`、`Date ± Int(days は add_days を使う)`、数値、`Money` に対して定義される。

### 5.4 環境（`ctx`）

すべての式は環境 `ctx` を参照できる。`ctx` は評価器への入力であり、これが決定論の要である。

| パス | 型 | 意味 |
|------|-----|------|
| `ctx.now` | `Instant` | 評価時刻。呼び出し側が固定して渡す。 |
| `ctx.actor` | `ActorContext?` | 実行主体。`ctx.actor.id: Id<User>`, `.role: Actor`, `.department: Ref<Department>` |
| `ctx.capabilities` | `List<Capability>` | 解決済み権限（`grant` から導出、§7.4） |
| `ctx.op.kind` | `create\|update\|delete\|query\|job` | 現在の操作種別 |
| `ctx.op.feature` | `Text?` | 実行中の feature / job の完全修飾 ID |
| `ctx.params.<P>` | 各 param の型 | テナント別に上書きされた `param` の実効値 |

`param` は式中で `P_xxx` と直接書ける。これは `ctx.params.P_xxx` の糖衣であり、
`configurable` でない param は IR にリテラル畳み込みされる。

### 5.5 決定論のための追加規則

1. **タイムゾーン変換は必ず明示引数**。`date_of` / `instant_at` は `tz` 引数を省略できない。
2. `instant_at` でローカル時刻が存在しない場合（DST 前進）は直後の存在する時刻へ、
   曖昧な場合（DST 後退）は **早い方（オフセットが大きい方）** を選ぶ。
3. `add_months` は月末クランプ。
4. 除算は厳密有理数。丸めは常に明示。
5. `List` は多重集合であり、順序に依存する演算は言語に存在しない。
6. `null` の伝播は行わない。`null` に `.` を適用すると実行時エラー `E_NULL_ACCESS`。
   短絡評価と `coalesce` で明示的に扱う。
7. `match` は網羅必須（検査 C-08）。`_` ワイルドカードは存在しない。

### 5.6 予約識別子

| 名前 | 使える場所 | 意味 |
|------|-----------|------|
| `self` | `rule` / `scope` / `feature.effect` / `feature.value` / `entity.field.derived` | 主対象インスタンス。`entity` セレクタならそのインスタンス、`feature` なら `subject:` / `draft`、`scope` なら判定対象 |
| `input` | `rule`（feature に束縛されたとき） / `feature` | 機能の入力 |
| `ctx` | `derive` 以外のすべて | 環境（§5.4） |
| `old` | `kind: postcondition` の `rule` | 操作前の `self` |
| `result` | `scenario.then` | query の戻り値 |

これらをユーザ定義の識別子として使うことはできない。

---

## 6. 宣言一覧

FSPEC の一級市民は次の 17 種である。

| 宣言 | 担当する関心事 |
|------|----------------|
| `requirement` | 上流要件のアンカー（トレーサビリティ） |
| `param` | 仕様中の定数・テナント設定値 |
| `enum` | 値集合 |
| `entity` | ドメイン上の概念とその関係 |
| `lifecycle` | 時間軸を持つ状態の変化 |
| `actor` | 利用者の種別 |
| `capability` | 権限の原子単位 |
| `scope` | 権限の作用範囲（述語） |
| `grant` | アクタ × 権限 × 範囲の唯一の対応表 |
| `rule` | 常に成り立つべき制約と、その違反時の扱い |
| `derive` | 純粋な計算（日割り、料金など） |
| `feature` | 利用者から見た振る舞いの単位 |
| `job` | 時刻・イベント起動の振る舞いの単位 |
| `event` | 機能間の疎な依存関係 |
| `error` | 違反の識別子とその分類 |
| `world` | 具体例のための初期状態（再利用可能） |
| `scenario` | 仕様に対する実行可能な具体例 |

（`module` / `import` は宣言ではなくファイル構造。）

---

## 7. 利用者・権限

### 7.1 `actor`

```fspec
actor Member {
  doc: "一般利用者。自分の予約のみ扱う。"
}

actor DeptAdmin extends Member {
  doc: "部門管理者。所属部門の予約と契約を扱う。"
}
```

- `extends` は **権限の包含関係のみ** を意味する。`DeptAdmin` は `Member` のすべての `grant` を継承する。
- 継承は単一継承・非循環（検査 C-09）。
- `actor` は組込み型 `Actor` の値でもある。エンティティのフィールドに `role: Actor` と書ける。
  **ロールを表す `enum` を別途定義してはならない**（検査 C-10）。

### 7.2 `capability`

```fspec
capability C_override_conflict {
  doc: "重複予約禁止規則を上書きして予約を確定する"
}
```

権限の原子単位。ロールを持たない。どのアクタが持つかは `grant` にのみ書く。

### 7.3 `scope`

```fspec
scope S_own  { doc: "自分が所有するもの", where: self.owner == ctx.actor.id }
scope S_dept { doc: "自部門のもの",       where: self.scope_key == ctx.actor.department }
scope S_all  { doc: "全体",               where: true }
```

`scope.where` の中で使える特別なパスは 2 つだけ。

- `self.owner` — 対象エンティティの `owner:` プロパティが指すフィールド値
- `self.scope_key` — 対象エンティティの `scope_by:` プロパティが指すフィールド値

これにより scope はエンティティ非依存に一度だけ書ける。
`owner` / `scope_by` を宣言していないエンティティに、それを参照する scope が適用されると検査 C-11 エラー。

### 7.4 `grant`

```fspec
grant DeptAdmin {
  C_cancel_reservation in S_dept
  C_change_plan        in S_dept
}
```

**アクタと権限の対応はこのブロックにしか書けない。** feature 側に権限を再掲する構文は存在しない。

認可の意味論（ランタイムはこの通りに実装しなければならない）:

```
allowed(actor, feature, self) :=
    let G = { (c, s) | (c, s) ∈ grants(a) for some a ∈ ancestors_or_self(actor) }
    in  ∃ (c, s) ∈ G.  c == feature.capability  ∧  eval(s.where, self)
```

- `ancestors_or_self` は `extends` 鎖。
- 同一 capability が複数 scope で付与されている場合、**いずれか 1 つが真なら許可**（scope は論理和）。
- `kind: query` の feature で、`returns` の要素型が `Ref<E>` の場合、
  `scope.where` は返却リストの **各要素に対するフィルタ** として適用される。
  これにより「部門管理者の一覧画面には自部門の予約だけが出る」が仕様から導出される。
- `returns` の要素型が `Ref<E>` でない場合（値の射影を返す query）、scope フィルタは適用されず、
  `capability` の有無だけが可否を決める。エンティティを返さない照会に所有者判定は意味を持たないためであり、
  「空き時間帯だけは全員に見せる」といった要求はこの形で表現する。

---

## 8. ドメイン

### 8.1 `entity`

```fspec
entity Reservation {
  doc: "会議室の予約 1 件"
  key: id
  owner: organizer
  scope_by: department

  field id:           Id<Reservation>
  field room:         Ref<catalog.Room>          { immutable: true }
  field organizer:    Ref<identity.User>         { immutable: true }
  field department:   Ref<identity.Department>   { derived: self.organizer.department }
  field period:       Interval<Instant>
  field status:       State<L_reservation>
  field cancel_reason: CancelReason?
  field created_at:   Instant                    { immutable: true }
}
```

| プロパティ | 型 | 意味 |
|-----------|-----|------|
| `key` | フィールド名 | 主キー。省略不可。 |
| `owner` | フィールド名 | `S_own` 系 scope が参照する所有者。省略可。 |
| `scope_by` | フィールド名 | `S_dept` 系 scope が参照する区画キー。省略可。 |

| field プロパティ | 意味 |
|-----------------|------|
| `derived: <expr>` | 導出フィールド。`effect` で代入すると検査 C-12 エラー。 |
| `immutable: true` | 生成後に変更不可。`update` での代入は検査 C-13 エラー。 |
| `default: <expr>` | 生成時の既定値 |
| `inverse: <QName>` | 逆関係の明示（`Room.reservations` など）。関係の基数は型（`Ref` / `List<Ref>` / `?`）で表す。 |

**関係を表す独立した宣言は存在しない。** 関係はフィールドの型そのもの。
逆方向が必要な場合のみ `inverse:` を書く。これにより「同じ関係が 2 箇所に書かれる」ことがない。

### 8.2 `enum`

```fspec
enum CancelReason {
  ByUser            { doc: "利用者本人による取消" }
  ByAdmin           { doc: "管理者による取消" }
  OverriddenByAdmin { doc: "管理者の強制上書きにより取消" }
  SubscriptionEnded { doc: "契約終了により取消" }
}
```

### 8.3 `lifecycle`

```fspec
lifecycle L_reservation of Reservation.status {
  doc: "予約の状態遷移"
  initial: Confirmed

  state Confirmed { doc: "確定済み。利用可能" }
  state Cancelled { doc: "取消済み", terminal: true }
  state Completed { doc: "利用終了", terminal: true }

  transition T_cancel:   Confirmed -> Cancelled
  transition T_complete: Confirmed -> Completed
}
```

- 状態集合は `State<L_reservation>` という型になる。**状態を表す `enum` を別に書いてはならない**（検査 C-14）。
- **`transition` にトリガは書かない。** どの feature / job / rule が遷移を起こすかは
  `effect` 中の `transition x to S` 文から導出される（§9.3）。
- `transition` にガード条件は書かない。ガードは `rule { kind: guard, on: [transition T_x] }` として書く。
  これにより「遷移条件」も他の制約と同じ単一の場所（`rule`）に集約される。

検査:
- C-15: 全状態が `initial` から到達可能
- C-16: `terminal: true` でない状態には出遷移が 1 本以上ある
- C-17: すべての `transition` を起こす主体が 1 つ以上存在する（デッド遷移がない）
- C-18: `create` 文で設定される状態は `initial` と一致する

---

## 9. 振る舞い

### 9.1 `rule` — 制約と違反時の扱い

**FSPEC において、述語（Bool を返す式）を書けるのは `rule` の `assert` / `when`、`scope.where`、
`derive` の本体、`effect` の `if` / `where`、`scenario.then` だけである。**
`feature` に前提条件を直接書く構文は存在しない。これが DRY の構造的保証である（検査 C-19）。

```fspec
rule R_no_double_booking {
  doc: "同一会議室で確定済み予約の時間帯が重なってはならない"
  kind: invariant
  on: [ entity Reservation ]
  when: self.status == Confirmed
  traces: [ req.REQ_09 ]

  let conflicts = [ r for r in Reservation
                    where r.id != self.id
                      and r.room == self.room
                      and r.status == Confirmed
                      and r.period overlaps self.period ]

  assert: count(conflicts) == 0

  on_violation: reject(E_ROOM_CONFLICT, blames: input.period)

  override {
    doc: "システム管理者は重複を承知で上書きできる。既存予約は取り消される。"
    capability: identity.C_override_conflict
    requested_by: input.force_override
    effect {
      for c in conflicts {
        transition c to Cancelled { cancel_reason: OverriddenByAdmin, cancelled_at: ctx.now }
        emit Ev_reservation_overridden { reservation: c.id, replaced_by: self.id, by: ctx.actor.id }
      }
    }
  }
}
```

#### プロパティ

| プロパティ | 必須 | 意味 |
|-----------|------|------|
| `kind` | ✓ | `invariant` / `precondition` / `postcondition` / `guard` |
| `on` | ✓ | 適用対象セレクタのリスト（下表） |
| `when` | | 適用条件。偽なら制約は不適用（＝真とみなす） |
| `let` | | 補助束縛。`assert` / `on_violation` / `override` から参照できる |
| `assert` | ✓ | 成り立つべき述語 |
| `on_violation` | ✓ | 違反時の扱い |
| `recheck` | | 他エンティティ更新時の再検査対象（§9.1.3） |
| `override` | | 権限による上書き（§9.1.4） |
| `traces` | | 由来する `requirement` |

#### セレクタ

| セレクタ | `self` の束縛 | 検査時点 |
|---------|--------------|---------|
| `entity E` | 変更後の `E` インスタンス | `kind` に従う（invariant は事後、precondition は事前） |
| `entity E on create` | 生成される `E` インスタンス | 生成前 |
| `entity E on update` / `on delete` | 対象インスタンス | 操作前 |
| `feature F` | `F` の `subject:` が指すインスタンス | precondition=事前 / postcondition=事後 |
| `transition T` | 遷移対象インスタンス | 遷移前 |
| `any_command` / `any_query` / `any_feature` | `subject` があればそれ、なければ未束縛 | 事前 |

#### 9.1.1 束縛アルゴリズム（規範）

ある `feature` / `job` `X` に対して適用される rule 集合は、次で **一意に** 定まる。

```
applies(X) := { R | R.on に entity E が含まれ、E ∈ writes(X)                       }
            ∪ { R | R.on に entity E on create が含まれ、X が E を create または commit する }
            ∪ { R | R.on に feature X が含まれる                                    }
            ∪ { R | R.on に transition T が含まれ、X が T を起こす                   }
            ∪ { R | R.on に any_command が含まれ、X.kind == command                 }
            ∪ { R | R.on に any_query   が含まれ、X.kind == query                   }
            ∪ { R | R.on に any_feature が含まれる                                   }
            ∪ { R | R.recheck に on write E があり、E ∈ writes(X)                    }
```

`writes(X)` は `effect` の `create` / `update` / `delete` / `commit` / `transition` 文から導出される（§9.3）。

#### 9.1.2 `on_violation` — 文脈別の違反処理

同じ制約でも文脈によって扱いが違うことがある。**制約を 2 本に分裂させてはならない。**
`on_violation` をブロック形式にして、文脈ごとの処分を書く。

```fspec
on_violation {
  when ctx.op.kind == create : reject(E_BEYOND_SERVICE_END, blames: input.period)
  default: compensate(E_RESERVATION_CANCELLED_BY_SERVICE_END) {
    effect {
      transition self to Cancelled { cancel_reason: SubscriptionEnded, cancelled_at: ctx.now }
      emit Ev_reservation_cancelled { reservation: self.id, reason: SubscriptionEnded }
    }
  }
}
```

処分（disposition）は 4 種。

| 処分 | 意味 | ランタイムの振る舞い |
|------|------|---------------------|
| `reject(E, blames: p)` | 操作を拒否 | 操作全体を中止し `E` を返す。`blames` は入力フィールドへの帰責（フォーム項目エラー表示の根拠） |
| `warn(E, blames: p)` | 続行するが記録 | 操作は成立。`E` を notice として返す |
| `allow()` | 何もしない | 制約を意図的に無効化する文脈を明示する |
| `compensate(E) { effect }` | 続行し、是正処置を適用 | 操作は成立。`effect` を同一原子操作内で適用し `E` を notice として返す |

ブロック形式では **記述順に最初にマッチした `when` が採用される**（決定的）。
`default` は必須（検査 C-20）。

#### 9.1.3 `recheck` — 他エンティティ変更による波及

`assert` が `self` 以外のエンティティ外延を参照する不変条件は、そのエンティティが変更されたときにも
破られうる。FSPEC は逆方向の到達を自動推論しない（一般には決定不能なため）。**明示的に書く。**

```fspec
recheck {
  on write billing.Subscription as s :
    [ r for r in Reservation where r.department == s.department and r.status == Confirmed ]
}
```

「`Subscription` が書き換えられたら、その部門の確定済み予約すべてについてこの rule を再評価せよ」。
`assert` 本体で参照している外部エンティティに `recheck` エントリがない場合は検査 C-21 エラー。
これにより「片方向しか考慮していない制約」を機械的に検出できる。

#### 9.1.4 `override` — 権限による上書き

```fspec
override {
  capability: identity.C_override_conflict
  requested_by: input.force_override
  effect { ... }
}
```

意味論:

```
違反が検出されたとき、
  R.override が存在し、
  has(R.override.capability) が真であり、
  eval(R.override.requested_by) が真ならば
    → on_violation の処分の代わりに R.override.effect を適用し、操作は成立する。
  そうでなければ
    → on_violation の処分に従う。
```

- `requested_by` が参照する `input.x` を持たない feature がこの rule に束縛されると検査 C-22 エラー。
  （＝「上書きできる操作なのに上書きフラグを受け取れない」を検出する）
- override は rule 側に 1 箇所だけ書く。上書き可能な feature が何本あっても記述は増えない。

#### 9.1.5 評価順序と評価状態（規範）

用語:

| 状態 | 内容 |
|------|------|
| **pre-state** | 操作前の状態 |
| **op-state** | pre-state に、当該操作内で `create` / `draft` されたインスタンスを加えたもの |
| **post-state** | 操作の差分をすべて適用した後の状態 |

1 つの `feature` / `job` の実行は次のフェーズ順に処理される。

```
 P0 認可          : allowed(actor, feature, self)  … 偽なら E_FORBIDDEN で中止
 P1 guard         : kind: guard の rule を pre-state で評価
 P2 precondition  : kind: precondition の rule を op-state で評価
 P3 effect 適用   : effect の全式を pre-state で評価し、差分を原子的に適用
 P4 invariant     : kind: invariant の rule を post-state で評価
 P5 postcondition : kind: postcondition の rule を post-state で評価
```

- 各フェーズ内では、rule を **モジュール宣言順 → ソース出現順** に評価する。この順序は IR に
  `rules_by_feature` として固定して載る。したがって違反の列挙順も一意である。
- あるフェーズで 1 つでも `reject` が生じたら、そのフェーズを最後まで評価して違反を全部集めたうえで
  操作を中止し、以降のフェーズは評価しない。`plan()` は集めた違反をすべて返す。
- `warn` / `compensate` / `override` は操作を中止しない。
- **`compensate` および `override` の effect を適用したあと、rule の再評価は行わない。**
  不動点反復をしないことで停止性と決定性を保証する。
  是正処置が別の制約を破る場合、それは仕様の誤りであり `scenario` で検出すべきものとする。

rule 本体の評価順は `when` → 参照された `let`（遅延、参照時に 1 度だけ）→ `assert` →
（違反時のみ）`on_violation` / `override`。`when` が偽なら `let` も `assert` も評価しない。

#### 9.1.6 補足規則

- `blames` が指す入力フィールドを持たない feature にその rule が束縛された場合、
  `blames` は省略される（エラーにはしない）。帰責先は UI のための補助情報であり、制約の一部ではない。
- C-21（`recheck` 必須）は **`kind: invariant` かつ `on: entity E`** の rule にのみ適用される。
  precondition / guard は操作時点で評価されるため、波及の考慮は不要。

### 9.2 `derive` — 純粋計算

```fspec
derive D_remaining_ratio(at: Instant, period: Interval<Instant>) -> Rational {
  doc: "課金期間の残存比率。日単位。at の当日は未使用日として数える。"
  let tz    = common.P_billing_timezone
  let total = days_between(date_of(period.start, tz), date_of(period.end, tz))
  let used  = days_between(date_of(period.start, tz), date_of(at, tz))
  value: rational(max(0, total - used), total)
}
```

- 参照できるのは **引数・`let`・`param`・他の `derive`・組込み関数** のみ。
  `ctx` も エンティティ外延も参照できない（検査 C-07）。完全に単体テスト可能。
- 再帰禁止（検査 C-23）。derive 呼び出しグラフは DAG。
- 同じ引数からは常に同じ値。ランタイムはメモ化してよい。

### 9.3 `feature` — 利用者から見た振る舞いの単位

```fspec
feature F_create_reservation {
  doc: "会議室を予約する"
  kind: command
  actor: Member
  capability: identity.C_reserve
  traces: [ req.REQ_08, req.REQ_09 ]

  input {
    room:           Ref<catalog.Room>
    period:         Interval<Instant>
    force_override: Bool = false
  }

  draft Reservation as self {
    room:       input.room
    organizer:  ctx.actor.id
    period:     input.period
    status:     Confirmed
    created_at: ctx.now
  }

  effect {
    commit self
    emit Ev_reservation_created { reservation: self.id }
  }
}
```

| プロパティ | 意味 |
|-----------|------|
| `kind` | `command`（状態を変える） / `query`（変えない）。既定 `command` |
| `actor` | この機能を実行しうる **最小** のアクタ。`extends` で継承したアクタも含まれる |
| `capability` | 必要な権限（1 つ）。scope は `grant` 側で決まる |
| `input {}` | 入力。既定値を持てる |
| `draft E as self {}` | まだ永続化されていない候補インスタンスを構築する。`rule` から `self` として参照できる |
| `subject: <expr>` | 既存インスタンスを対象にする機能で、`self` を束縛する |
| `effect {}` | 状態変化（command のみ） |
| `returns` / `value` | 戻り値の型と式（query のみ） |
| `after: [F...]` | 明示的な順序依存（この機能の前に別機能が成立している必要がある） |
| `traces` | 由来する requirement |

**書かないもの（すべて導出される）:**

| 導出されるもの | 導出規則 |
|---------------|---------|
| `reads` | `effect` / `value` / `draft` / 適用される rule の本体が参照するエンティティ全体 |
| `writes` | `create` / `commit` / `update` / `delete` / `transition` 文の対象エンティティ |
| `errors` | `applies(F)` の各 rule の `on_violation` に現れる error 全体 + `capability` 不足時の `E_FORBIDDEN` |
| 前提条件 | `applies(F)` のうち `kind: precondition` のもの |
| 事後条件 | `applies(F)` のうち `kind: postcondition` のもの |
| 遷移 | `transition` 文から |
| 発行イベント | `emit` 文から |

#### `draft` と `commit`

生成系の機能では、不変条件を「生成前の候補」に対して評価する必要がある。
`draft E as self { ... }` が候補を作り、`commit self` が確定させる。
`draft` があるのに `effect` に `commit` がない場合は検査 C-24 エラー。

#### query の例

```fspec
feature F_view_department_reservations {
  kind: query
  actor: DeptAdmin
  capability: identity.C_view_reservation
  input { period: Interval<Instant> }
  returns: List<Ref<Reservation>>
  value: [ r for r in Reservation where r.period overlaps input.period ]
}
```

`grant DeptAdmin { C_view_reservation in S_dept }` により、`value` の結果は
`S_dept.where` で自動的に絞り込まれる（§7.4）。絞り込み条件を `value` に書いてはならない（検査 C-25）。

### 9.4 `effect` — 状態変化の記述

```fspec
effect {
  let ratio = D_remaining_ratio(ctx.now, self.current_period)
  update self { plan: input.new_plan }
  if ratio > rational(0,1) {
    create InvoiceLine as line {
      invoice: open_inv.id
      kind:    ProrationCharge
      amount:  D_proration_delta(self.plan.monthly_price, input.new_plan.monthly_price, ratio)
    }
  }
  emit Ev_plan_changed { subscription: self.id, to_plan: input.new_plan }
}
```

**規範的意味論:**

1. `effect` は手続きではなく **状態差分の宣言** である。
2. ブロック内のすべての式は **操作前の状態（pre-state）に対して評価される**。
   したがって `update self { plan: X }` の後に `self.plan` と書いても旧値になる。
   これにより文の順序が結果に影響しない（順序非依存＝決定論）。
3. 生成した差分は原子的に適用される。
4. 同一インスタンスの同一フィールドに 2 つ以上の値が割り当てられた場合は
   実行時エラー `E_CONFLICTING_EFFECT`（静的に検出できる範囲は検査 C-26 で警告）。
5. `for` 文は集合に対する並列適用であり、反復順に依存しない。
6. `create X as y` で束縛した `y` は、その `create` で明示的に代入したフィールドと `y.id` を参照できる。

| 文 | 意味 |
|----|------|
| `create E as x { f: v, ... }` | `E` の新インスタンスを生成 |
| `commit x` | `draft` で作った候補を確定 |
| `update p { f: v, ... }` | 既存インスタンスのフィールドを更新 |
| `delete p` | 削除 |
| `transition p to S { f: v }` | `p` の状態フィールドを `S` へ遷移（併せて他フィールドも設定可） |
| `emit Ev { f: v }` | イベント発行 |
| `for v in expr where pred { ... }` | 集合への並列適用 |
| `if expr { ... } else { ... }` | 条件付き差分 |
| `let x = expr` | 束縛 |

### 9.5 `job` — 時間軸の振る舞い

```fspec
job J_close_billing_period {
  doc: "課金期間が終了した契約について請求を確定し、次期間を開く"
  trigger: schedule(daily at 03:00, tz: common.P_billing_timezone)
  traces: [ req.REQ_04 ]
  effect { ... }
}
```

`trigger` は 3 形態。

| 形態 | 例 |
|------|-----|
| 時刻起動 | `schedule(daily at 03:00, tz: ...)` / `schedule(monthly on day 1 at 03:00, tz: ...)` / `schedule(every PT15M)` |
| イベント起動 | `on billing.Ev_subscription_ended` |
| 手動起動 | `manual` |

job は `capability` を持たない（システム主体）。`ctx.actor` は `null`、`ctx.op.kind` は `job`。
job にも `applies(J)` により rule が束縛される。

### 9.6 `event`

```fspec
event Ev_reservation_overridden {
  doc: "管理者の強制上書きにより既存予約が取り消された"
  payload {
    reservation: Ref<Reservation>
    replaced_by: Ref<Reservation>
    by:          Ref<identity.User>
  }
}
```

イベントは **機能間の疎な依存関係** を表す唯一の手段。`emit` する側と `on` で受ける側の
双方から参照グラフの辺が張られる。発行者のいないイベントは検査 C-27 で警告。

### 9.7 `error`

```fspec
error E_ROOM_CONFLICT {
  doc: "同一会議室・同一時間帯に確定済みの予約が存在する"
  class: conflict
  severity: error
  message: "指定の時間帯には既に予約があります"
}
```

| `class` | 意味 |
|---------|------|
| `invalid_input` | 入力値そのものが不正 |
| `forbidden` | 権限不足 |
| `not_found` | 対象が存在しない |
| `conflict` | 他の状態と両立しない |
| `precondition_failed` | 前提状態を満たさない |
| `quota_exceeded` | 上限超過 |
| `internal` | 仕様外の内部不整合 |

`class` はプロトコル中立である。HTTP ステータスへの写像は基本設計レイヤーの決定事項
（WORKFLOW.md §4.3 に既定の対応表がある）。

組込みエラー（宣言不要・常に存在）: `E_FORBIDDEN`, `E_NOT_FOUND`, `E_NULL_ACCESS`,
`E_SPEC_VIOLATION`, `E_CONFLICTING_EFFECT`, `E_INSUFFICIENT_CONTEXT`。

### 9.8 `world` と `scenario`

`world` は再利用可能な初期状態、`scenario` は「その状態で 1 操作を行うと何が起きるか」の宣言。

```fspec
world W_base {
  now: 2026-05-01T10:00:00+09:00
  actor: identity.Member
  actor_id: "u-1"
  fixture catalog.Room r1 { id: "room-1", hourly_rate: 3000 JPY, bookable: true }
}

scenario SC_late_cancel_charges_fee {
  doc: "キャンセル期限を過ぎた取消には違約金が計上される"
  traces: [ req.REQ_07 ]

  given {
    from: W_base
    now: 2026-05-01T10:00:00+09:00
    fixture reservation.Reservation res1 {
      id: "res-1", room: "room-1", organizer: "u-1"
      period: interval(2026-05-01T14:00:00+09:00, 2026-05-01T16:00:00+09:00)
      status: Confirmed, created_at: 2026-04-01T00:00:00+09:00
    }
  }

  when: reservation.F_cancel_reservation { reservation: "res-1" }

  then {
    expect reservation.Reservation["res-1"].status == Cancelled
    expect notice policy.E_LATE_CANCELLATION
    expect created billing.InvoiceLine where amount == 3000 JPY
  }
}
```

- `from:` は `world` を取り込む。同じ束縛名の `fixture` は置換、`now` / `actor` / `actor_id` /
  `params` は上書き、新しい束縛名は追加。継承は単一・非循環（検査 C-28）。
- **`fixture` は初期状態としてそのまま採用される。初期状態に対して rule は評価されない。**
  これにより「制約違反状態からの回復」も具体例として書ける。
- `when:` は feature 呼出し（`F_x { 引数 }`）または `job J_x`。
- `then` の中では `result`（query の戻り値）と、post-state のエンティティ索引が参照できる。
- `expect rejected E` は「拒否理由の集合に `E` が含まれる」を意味する（唯一の理由であることは要求しない）。
- `expect` の形式: 述語式 / `rejected E` / `notice E` / `emitted Ev [where p]` / `created E [where p]`。
- 文字列リテラルは `Id<E>` / `Ref<E>` が要求される位置では主キー値として解釈される。

`scenario` は IR に載り、ランタイム／CI が **仕様だけで実行して検証できる**。
`derive` の単体テストベクタや回帰テストの元データにもなる。

---

## 10. 静的検査（規範）

適合する処理系は以下をすべて実装しなければならない。`ERROR` は仕様を不正とし、`WARN` は報告のみ。

| ID | 種別 | 内容 |
|----|------|------|
| C-01 | ERROR | ファイル名とモジュール名が一致 |
| C-02 | ERROR | モジュール内の識別子が宣言種別を跨いで一意 |
| C-03 | ERROR | `import` に循環がない |
| C-04 | WARN | 命名規約（§3.1）に適合 |
| C-05 | ERROR | `Rational` をエンティティのフィールド型に使っていない |
| C-06 | ERROR | `Rational` を `Money` / `Decimal` の位置に丸めなしで代入していない |
| C-07 | ERROR | `derive` が `ctx` またはエンティティ外延を参照していない |
| C-08 | ERROR | `match` が列挙のすべての場合を尽くしている |
| C-09 | ERROR | `actor extends` に循環がない |
| C-10 | ERROR | `actor` と同名／同義のロール `enum` が存在しない（`Actor` 型を使うこと） |
| C-11 | ERROR | `scope` が参照する `owner` / `scope_by` が対象エンティティに宣言されている |
| C-12 | ERROR | `derived:` フィールドに代入していない |
| C-13 | ERROR | `immutable:` フィールドを `update` していない |
| C-14 | ERROR | 状態を表す `enum` が別に定義されていない（`State<L>` を使うこと） |
| C-15 | ERROR | すべての状態が `initial` から到達可能 |
| C-16 | ERROR | 非終端状態に出遷移が 1 本以上ある |
| C-17 | ERROR | すべての `transition` に、それを起こす feature / job / rule が 1 つ以上ある |
| C-18 | ERROR | `create` が設定する状態が `initial` と一致する |
| C-19 | ERROR | 述語が許可された位置（§9.1 冒頭）以外に出現しない |
| C-20 | ERROR | `on_violation` ブロック形式に `default` がある |
| C-21 | ERROR | `kind: invariant` かつ `on: entity E` の rule について、`assert` が参照する `E` 以外のエンティティすべてに `recheck` エントリがある |
| C-22 | ERROR | `override.requested_by` が参照する入力を、束縛されるすべての feature が持つ |
| C-23 | ERROR | `derive` 呼び出しグラフが非循環 |
| C-24 | ERROR | `draft` があれば `effect` に対応する `commit` がある |
| C-25 | ERROR | `query` の `value` に scope 相当の絞り込みが重複していない（`ctx.actor` 参照を検出） |
| C-26 | WARN | 同一フィールドへの二重代入の可能性 |
| C-27 | WARN | 発行者のいない `event`、受け手のいない `event` |
| C-28 | ERROR | `world` / `given` の `from:` 継承が単一かつ非循環 |
| C-29 | ERROR | すべての `scenario` の `when:` が存在する feature / job を指し、引数の型が `input` と適合する |
| **C-DUP** | ERROR | **正規化した `assert` AST のハッシュが 2 つ以上の rule で一致しない** |
| C-COV-1 | ERROR | すべての `requirement` が 1 つ以上の `feature` / `rule` / `job` から `traces` されている |
| C-COV-2 | WARN | すべての `capability` が 1 つ以上の `grant` に現れる |
| C-COV-3 | WARN | すべての `entity` フィールドが、いずれかの `feature` / `job` / `rule` から読まれるか書かれる |
| C-COV-4 | WARN | すべての `error` がいずれかの `on_violation` で使われる |
| C-COV-5 | WARN | すべての `actor` が 1 つ以上の `feature` から到達可能 |
| C-COV-6 | ERROR | すべての `feature` に `capability` が指定されている |

**C-DUP** が受け入れ基準「同一の制約が 2 箇所以上に重複して書かれていない」の機械的保証である。
正規化は: α 変換（束縛変数の番号付け）→ `and` / `or` の結合子平坦化＋引数の正規順ソート →
`let` のインライン展開 → 定数畳み込み、の順で行う（決定的）。

C-COV-* 群が「網羅できているか判定できない」への回答であり、
`fspec coverage` はこれらの結果を表として出力する。

---

## 11. 参照グラフと影響追跡

コンパイラは全ノードを頂点、参照関係を型付き辺とする有向グラフ `G` を構築する。

### 11.1 辺の種類（規範。この表がすべてであり、これ以外の辺は作られない）

| 辺 | from | to | 生成元 |
|----|------|-----|-------|
| `traces` | feature / rule / job / scenario | requirement | `traces:` |
| `uses_capability` | feature | capability | `capability:` |
| `grants` | actor | capability | `grant` |
| `scoped_by` | grant エントリ | scope | `grant ... in S` |
| `extends` | actor | actor | `extends` |
| `has_field` | entity | entity / enum / lifecycle | フィールド型 |
| `state_of` | lifecycle | entity | `of E.f` |
| `constrains` | rule | entity / feature / transition | `on:` |
| `reads` | feature / job / rule / derive | entity / param / derive | 本体の参照 |
| `writes` | feature / job / rule(override, compensate) | entity | `create`/`update`/`delete`/`commit` |
| `transitions` | feature / job / rule | transition | `transition x to S` |
| `emits` | feature / job / rule | event | `emit` |
| `triggered_by` | job | event | `trigger: on Ev` |
| `raises` | rule | error | `on_violation` |
| `overridden_by` | rule | capability | `override.capability` |
| `rechecks` | rule | entity | `recheck on write E` |
| `calls` | derive / feature / job / rule | derive | 関数呼出し |
| `param_of` | 任意 | param | `P_x` 参照 |
| `after` | feature | feature | `after:` |
| `applies_to` | rule | feature / job | §9.1.1 の束縛アルゴリズム（導出辺） |

### 11.2 影響追跡（受け入れ基準 4）

```
impact(n)  := { m | G の逆辺で n から到達可能 }          … n を変えると影響を受けるもの
depends(n) := { m | G の順辺で n から到達可能 }          … n が依存しているもの
blast(n)   := impact(n) ∩ { feature, job, scenario }    … 再検証すべき振る舞い
```

`fspec impact <id>` はこれを出力する。**辺の定義が上表で閉じているため、結果は一意である。**

例: `param P_cancel_free_window` を変更したときの `blast` には、
`R_cancel_before_deadline` を経由して `F_cancel_reservation`、
その `override` を経由して `C_waive_charge` を持つロール、
`compensate` を経由して `billing.InvoiceLine` の生成、
および `SC_late_cancel_charges_fee` が含まれる。

### 11.3 差分影響

`fspec diff <old.ir.json> <new.ir.json>` は、ノード単位のハッシュ（正規化 AST + プロパティ）を比較し、
変更ノード集合 `Δ` について `⋃ blast(n) for n ∈ Δ` を返す。これが変更時の再レビュー・再テスト範囲。

---

## 12. FSPEC IR — ランタイム表現

コンパイラは `.fspec` 群から単一の正規化 JSON（IR）を生成する。
JSON Schema は [`ir-schema.json`](./ir-schema.json)。

### 12.1 構造

```json
{
  "fspec_version": "1.0",
  "ir_hash": "sha256:...",
  "modules": ["common", "identity", "..."],
  "nodes": {
    "reservation.R_no_double_booking": {
      "kind": "rule",
      "module": "reservation",
      "props": { "kind": "invariant", "on": [{"sel":"entity","target":"reservation.Reservation"}] },
      "lets": [ { "name": "conflicts", "expr": { "...AST..." } } ],
      "assert": { "...AST..." },
      "on_violation": [ { "when": null, "disposition": { "op": "reject", "error": "...", "blames": ["input","period"] } } ],
      "override": { "capability": "identity.C_override_conflict", "requested_by": {"...AST..."}, "effect": [ ... ] },
      "hash": "sha256:..."
    }
  },
  "edges": [ { "from": "...", "to": "...", "kind": "constrains" } ],
  "indexes": { "...": "..." },
  "checks": { "status": "pass", "results": [ ... ] }
}
```

### 12.2 式 AST の JSON 形式

すべてのノードは `{"n": "<種別>", ...}`。

| `n` | 形 |
|-----|-----|
| `lit` | `{"n":"lit","t":"Money","v":{"amount":"3000","currency":"JPY"}}` |
| `path` | `{"n":"path","base":"self","segs":["room","hourly_rate"]}` |
| `ref` | `{"n":"ref","id":"catalog.Room"}` |
| `bin` | `{"n":"bin","op":"overlaps","l":{...},"r":{...}}` |
| `un` | `{"n":"un","op":"not","e":{...}}` |
| `call` | `{"n":"call","fn":"round_money","args":[{...}]}` |
| `derive` | `{"n":"derive","id":"billing.D_late_cancel_fee","args":[{...}]}` |
| `compr` | `{"n":"compr","var":"r","src":{...},"where":{...}\|null,"body":{...}}` |
| `quant` | `{"n":"quant","q":"exists","var":"r","src":{...},"where":{...},"body":{...}}` |
| `if` | `{"n":"if","c":{...},"t":{...},"f":{...}}` |
| `match` | `{"n":"match","e":{...},"arms":[{"case":"...","body":{...}}]}` |
| `idx` | `{"n":"idx","src":{...},"key":{...}}` |

数値はすべて **文字列** で表現する（JSON の double 化を避けるため）。
`Rational` は `{"num":"...","den":"..."}`。

### 12.3 索引（コンパイラが生成、ランタイムが O(1) で引く）

| 索引 | キー → 値 |
|------|----------|
| `rules_by_entity` | entity id → rule id[]（`kind` 別に細分） |
| `rules_by_feature` | feature id → rule id[]（§9.1.1 の適用順） |
| `rules_by_transition` | transition id → guard rule id[] |
| `recheck_index` | entity id → `{rule, selector_expr}[]` |
| `capabilities_by_actor` | actor id → `{capability, scope}[]`（`extends` 展開済み） |
| `features_by_actor` | actor id → feature id[] |
| `transitions_by_state` | `L.state` → `{transition, to, triggers[]}[]` |
| `errors_by_feature` | feature id → error id[]（導出済み） |
| `blast` | node id → node id[]（事前計算した影響集合） |
| `derive_order` | derive の位相順 |

### 12.4 値の正規表現形式（`text()` と IR リテラル）

| 型 | 形式 |
|----|------|
| `Instant` | RFC 3339 UTC（`2026-05-01T01:00:00Z`） |
| `Date` | `YYYY-MM-DD` |
| `Duration` | ISO 8601（正規形。`PT90M` → `PT1H30M`） |
| `Money` | `{"amount":"3000","currency":"JPY"}` |
| `Decimal(s)` | 小数点以下ちょうど `s` 桁の文字列 |
| `Rational` | 既約分数、分母正 |

---

## 13. ランタイム API 契約

Web アプリケーションに組み込むためのインタフェース。言語非依存だが、
以下の TypeScript シグネチャを規範とする。

```ts
type Ctx = {
  now: string;                        // RFC3339
  actor: { id: string; role: string; department: string } | null;
  params?: Record<string, unknown>;   // テナント上書き
};

interface QueryPort {
  // エンティティ外延に対する問い合わせ。filter は IR の AST 断片。
  // 実装は述語をストレージへプッシュダウンしてよいが、結果集合は同一でなければならない。
  select(entity: string, filter: Ast | null): Promise<Row[]>;
  get(entity: string, id: string): Promise<Row | null>;
}

interface Spec {
  /** 単一 rule の評価 */
  checkRule(ruleId: string, self: Row | null, input: Input, ctx: Ctx):
    Promise<{ ok: true } | {
      ok: false;
      error: string;
      severity: 'error' | 'notice';
      blames?: string[];                 // ["input","period"]
      overridableBy?: string;            // capability id
      disposition: 'reject' | 'warn' | 'compensate';
    }>;

  /** feature 実行前の全前提条件評価。フォームのバリデーション根拠。 */
  validate(featureId: string, input: Input, ctx: Ctx):
    Promise<{ ok: boolean; violations: Violation[] }>;

  /** 認可判定。画面のボタン表示制御の根拠。 */
  can(featureId: string, self: Row | null, ctx: Ctx):
    Promise<{ allowed: boolean; reason?: 'no_capability' | 'out_of_scope' }>;

  /** 現在の状態から実行可能な遷移＝UI に出すべきアクション一覧 */
  availableActions(entity: string, self: Row, ctx: Ctx):
    Promise<{ transition: string; to: string; via: string; enabled: boolean; blockedBy?: string[] }[]>;

  /** 純関数の評価。日割り計算などをサーバ・クライアント双方で同一に行う。 */
  evalDerive(deriveId: string, args: unknown[]): unknown;

  /** query 機能の実行（scope フィルタ自動適用） */
  runQuery(featureId: string, input: Input, ctx: Ctx): Promise<Row[]>;

  /** 影響追跡（開発時／管理画面用） */
  impact(nodeId: string): string[];

  /** 機能実行時に適用すべき差分と notice を計算する。永続化は呼び出し側の責務。 */
  plan(featureId: string, input: Input, ctx: Ctx):
    Promise<{ ok: boolean; delta: Delta[]; events: EventInstance[]; notices: Violation[]; errors: Violation[] }>;
}
```

### 13.1 評価の決定性保証

- `checkRule` / `plan` は `(ir_hash, featureId, input, ctx, QueryPort が返す集合)` の関数である。
  同じ入力なら常に同じ出力。
- `QueryPort` が必要なデータを返せない場合、評価器は `false` を返してはならない。
  `E_INSUFFICIENT_CONTEXT` を送出する（サイレント失敗の禁止）。
- `plan` は差分のみを返し、永続化しない。トランザクション境界と楽観ロックは基本設計の決定事項。

### 13.2 画面制御での使い方

| UI の関心事 | 参照する API |
|------------|-------------|
| ボタンの表示／非表示 | `can(featureId, self, ctx)` |
| ボタンの活性／非活性と理由 | `availableActions(...)` の `enabled` / `blockedBy` |
| フォーム項目のエラー表示 | `validate(...)` の `violations[].blames` |
| 一覧の絞り込み | `runQuery(...)`（scope 自動適用） |
| 金額のプレビュー表示 | `evalDerive('billing.D_proration_delta', ...)` |
| 「この操作は課金が発生します」警告 | `plan(...)` の `notices`（`compensate` 由来） |

---

## 14. 明示的に対象外とするもの

| 対象外 | 理由（詳細は RATIONALE.md） |
|-------|---------------------------|
| 画面・レイアウト・遷移図 | 仕様ではなく設計。ただし画面制御の**根拠**は §13.2 で提供する |
| API エンドポイント / HTTP / GraphQL | プロトコル選択は基本設計の決定 |
| DB スキーマ・索引・正規化 | 永続化戦略は基本設計の決定 |
| トランザクション境界・ロック戦略 | ただし §9.1.3 の `recheck` が「同時実行制御が必要な制約」を機械的に指し示す |
| 非機能要件（性能・可用性） | 別レイヤー。FSPEC は述語で表現できない |
| メッセージの多言語カタログ | `error.message` は既定文言。翻訳は実装の関心事 |
| エンティティの継承 / サブタイピング | 列挙 + 省略可能フィールド、または別エンティティで表す |
| 値オブジェクト（record） | 組込み複合型（`Interval` など）か、主キーを持つエンティティで表す |
| ループ・再帰・任意計算 | 全域性と決定論のため |

---

## 15. バージョニング

- 仕様ファイルは `module` ブロックに `version:` を持てる（省略可）。
- IR の `ir_hash` は全ノードハッシュの決定的な畳み込み。CI はこれを固定して差分を検出する。
- 破壊的変更（フィールド削除、状態削除、error class 変更）は `fspec diff` が `BREAKING` として分類する。
