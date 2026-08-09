# fspec 言語仕様 (Feature Spec Language) v1.0

fspec は、業務系 Web アプリケーションの「機能仕様」レイヤーを記述するための DSL である。
仕様は AI が書き、AI が読み、人間がレビューする。この前提から、次の 3 原則を言語設計の
最上位に置く。

1. **単一定義 (DRY)** — ひとつの制約・ひとつの計算・ひとつの状態遷移は、仕様全体で
   ちょうど一箇所に書かれる。他の場所からは名前で参照する。参照は全てコンパイラが
   解決・検証する。
2. **決定論** — 同じ仕様ファイル集合からは、常に同じ AST・同じ導出結果・同じ実行時
   判定が得られる。自然言語は `doc` 文字列(非規範)にのみ現れ、機械処理の経路には
   一切乗らない。数値は浮動小数点を使わず有理数演算+明示丸めで定義する。
3. **導出可能性** — 基本設計の入力(データモデル、権限マトリクス、状態遷移図、
   API 操作カード、エラーカタログ、バッチ一覧、影響範囲)は、仕様の AST から
   機械的アルゴリズムで一意に導出できる(導出手順は WORKFLOW.md)。

本文書の構成:

- §1 ファイルとモジュール
- §2 字句
- §3 型システム
- §4 式
- §5 宣言(currency / param / enum / actors / entity / rule / calc / behavior)
- §6 実行時セマンティクス
- §7 整合性検査と網羅性検査
- §8 依存グラフと影響分析
- §9 コンパイル済み IR とランタイム API
- §10 文法定義(EBNF 全文)
- §11 予約語・組み込み一覧

---

## 1. ファイルとモジュール

- 仕様は 1 つ以上の `.fspec` ファイルからなる。ディレクトリ内の全 `.fspec` ファイルを
  ファイル名の辞書順に読み込んだ集合を **仕様セット** と呼び、コンパイルの単位とする。
- 各ファイルは `module <ident>` 宣言で始まる。モジュールは名前空間ではなく、
  ドキュメント生成・影響分析のグルーピング単位である。
- **トップレベル名はすべて仕様セット全体でグローバル一意**。import 文は存在しない。
  参照は常に非修飾名で書く(理由は RATIONALE.md §3.6)。
- 名前空間は 2 つ: **型名空間**(entity / enum、TYPENAME)と **値名空間**
  (behavior / rule / calc / param / actor、IDENT)。
  加えてエンティティ内部に field / derive / transition のローカル名前空間がある。
  修飾名 `Entity.member`(例 `Reservation.cancel`)は導出物・影響分析の表示に使う。

## 2. 字句

### 2.1 トークン

| トークン | 正規表現 | 例 | 用途 |
|---|---|---|---|
| IDENT | `[a-z][a-z0-9_]*` | `cancel_reservation` | 値・フィールド・behavior 等の名前 |
| TYPENAME | `[A-Z][A-Za-z0-9]*` かつ小文字を1文字以上含む | `Reservation` | entity / enum 名 |
| CODE | `[A-Z][A-Z0-9_]*`(小文字を含まない) | `RESERVATION_OVERLAP` | エラーコード・通貨コード |
| ATOM | `#[a-z][a-z0-9_]*` | `#confirmed` | enum 値・状態・アクター値・丸めモード |
| INT | `[0-9]+` | `24` | 整数リテラル |
| DECIMAL | `[0-9]+\.[0-9]+` | `1.5` | 10進リテラル |
| STRING | `"([^"\\]|\\.)*"` | `"予約を取り消す"` | doc / trace 専用 |
| DURATION | `[0-9]+(min\|h\|d)` | `24h` | 期間リテラル |

大文字始まりの語は、**小文字を 1 文字も含まなければ CODE、含めば TYPENAME** として
一意に字句解析される(`JPY` → CODE、`Room` → TYPENAME)。最長一致でトークン化する
(`24h` は DURATION 1 トークンであり INT + IDENT ではない)。

### 2.2 その他

- コメントは `//` から行末まで。仕様の意味には寄与しない(AST に残さない)。
- 空白・改行はトークン区切りとしてのみ意味を持つ。文の区切り記号(`;`)はない。
  各構文はキーワードと `{ }` で自己区切りされる。
- STRING は `doc` / `trace` 節にのみ出現できる。式の中に文字列は書けない
  (自然言語への逃げ道を文法レベルで塞ぐ)。

## 3. 型システム

### 3.1 基本型

| 型 | 意味 |
|---|---|
| `Bool` | 真偽値 |
| `Int` | 整数(多倍長) |
| `Decimal` | 有理数(内部表現は分数。浮動小数点は存在しない) |
| `String` | 文字列(フィールド型としてのみ。式では比較 `==` `!=` のみ可) |
| `DateTime` | 時刻(UTC、分解能ミリ秒)。Date 型はない(RATIONALE §4.11) |
| `Duration` | 期間 |
| `Money` | 通貨額。仕様セットの `currency` 宣言で通貨は単一に固定 |
| `actor` | アクター値。`actors` 宣言のメンバーが値(ATOM で書く) |
| `E`(TYPENAME) | enum 型 |
| `ref E` | エンティティ `E` のインスタンスへの参照。同一性で比較する |
| `optional T` | `T` または `none` |
| `set<T>` | 有限集合。calc の返り値・`output`・集合式にのみ現れる(フィールド型不可) |

### 3.2 数値と Money の決定論

- `Int`・`Decimal`・`Money` の算術はすべて**厳密な有理数演算**。丸めは組み込み
  `round(x, mode)` を書いた場所でのみ起こる。
- `Money` の型検査は「丸め済み (`Money`)」と「未丸め (`Money~`、表面文法には現れない
  内部型)」を区別する:
  - `Money ± Money` → `Money` / `Money * Int` → `Money` / `sum` → `Money`
  - `Money * Decimal`、`Money / Int`、`Money / Decimal` → `Money~`
  - `round(Money~ | Money, mode)` → `Money`
  - フィールドへの格納・比較・`output` には `Money` が要求される。
    したがって**除算・小数倍を含む金額式には必ず round が書かれる**ことが型検査で保証される。
- 丸めモードは ATOM で指定: `#half_up` `#half_even` `#floor` `#ceil`(通貨最小単位への丸め)。

### 3.3 時刻・期間

- `DateTime - DateTime` → `Duration`、`DateTime ± Duration` → `DateTime`。
- `Duration` 同士の加減・整数倍が可能。
- 月単位の加算は暦計算のため演算子ではなく組み込み `add_months(dt, n)` を使う。
  意味論: 月数を加算し、日が加算後の月に存在しない場合は月末日に丸める。時分秒は保存。

### 3.4 optional と narrowing

- `optional T` の値は `none` と比較できる。`none` リテラルの型は文脈から決まる。
- `if` / `when` の条件が連言の一部として `path != none` を含むとき、その分岐本体では
  `path` は `T` に絞り込まれる(パスは `x.f.g` 形式の静的パスに限る)。
- 絞り込みなしに `optional T` のフィールドへアクセスする式は型エラー。

### 3.5 部分型

- `T <: optional T`(非 optional 値は optional 文脈にそのまま書ける)。
- それ以外の暗黙変換はない(`Int` → `Decimal` の暗黙昇格のみ許す)。

## 4. 式

### 4.1 演算子と優先順位(弱い順)

| 優先度 | 演算子 | 結合 |
|---|---|---|
| 1 | `implies` | 右 |
| 2 | `or` | 左 |
| 3 | `and` | 左 |
| 4 | `not` | 前置 |
| 5 | `==` `!=` `<` `<=` `>` `>=` | 非結合(連鎖不可) |
| 6 | `+` `-` | 左 |
| 7 | `*` `/` | 左 |
| 8 | 単項 `-` | 前置 |
| 9 | `.`(フィールド/derive アクセス)、関数適用 | 左 |

比較は非結合であり `a < b < c` は構文エラー(曖昧さの排除)。

### 4.2 式の形

- **リテラル**: `INT` `DECIMAL` `DURATION` `true` `false` `none` `ATOM`
- **文脈値**: `caller`(実行主体、principal エンティティへの ref)、`now`(評価時刻)、
  `self`(entity 内の derive / lifecycle で自インスタンス)、`input`(behavior の入力レコード)
- **エンティティ外延**: TYPENAME を式の位置に書くと `set<ref E>`(全インスタンス集合)
- **select**: `select x in <集合式> where <Bool式>` → 部分集合
- **集約(組み込み関数)**: `exists(s)` `is_empty(s)` `count(s)` `the(s)`
- **sum**: `sum(x in <集合式>, <数値式>)`
- **条件**: `if c then a else b`(`else` 必須。`then`/`else` の式は右に貪欲)
- **束縛**: `let x = e in body`
- **呼び出し**: `calc` および組み込み関数の適用 `f(a, b)`

`select` / `foreach` / `sum` / 集約が受け取る集合式の評価結果は、
**エンティティ内部 ID の昇順で全順序化**される。集合を列挙・畳み込みする処理の結果は
これにより一意に定まる(§6.5)。

### 4.3 ATOM の型解決

ATOM は出現文脈の期待型で解決する: 比較の相手・代入先フィールド・関数仮引数の型が
enum / actor / lifecycle 状態型であれば、その型のメンバーとして解決する。
期待型が定まらない位置の ATOM は型エラー。遷移宣言の `:` 以降の ATOM は
その lifecycle の状態として解決する。

### 4.4 純粋性

式に副作用はない。`create` / `update` / `transition` は式ではなく effect 文(§5.8)。
calc は再帰(直接・間接とも)を持てない(W-08)。したがって全ての式評価は停止する。

## 5. 宣言

### 5.1 currency

```fspec
currency JPY
```

仕様セットに**ちょうど 1 回**。全 `Money` 値の通貨と最小単位(JPY=1円)を固定する。
多通貨は扱わない(RATIONALE §4.16)。

### 5.2 param

```fspec
param cancellation_notice: Duration = 24h {
  doc "予約開始の何時間前までキャンセル料なしで取り消せるか"
}
```

デプロイ単位で調整しうる設定値。既定値はリテラルに限る(式不可)。ランタイムは起動時に
上書き値を注入できるが、評価中は不変。型は基本型のみ(`ref`・集合不可)。

### 5.3 enum

```fspec
enum ChargeReason { #period_fee, #proration, #late_cancellation }
```

### 5.4 actors

```fspec
actors {
  member       { doc "一般利用者" }
  dept_admin   { doc "部門管理者" }
  system_admin { doc "システム管理者" }
}
```

仕様セットにちょうど 1 回。アクター(ロール)集合を宣言する。

- 仕様セット内のいずれかの entity が `actor` 型フィールドを**ちょうど 1 つ**持たねば
  ならない(W-04)。そのエンティティが **principal** であり、`caller` の型は
  `ref <principal>` になる。
- ロール継承はない。behavior ごとに許可アクターを明示列挙する(RATIONALE §3.7)。

### 5.5 entity

```fspec
entity Reservation {
  doc "会議室の予約"
  field room:      ref Room
  field owner:     ref User
  field starts_at: DateTime
  field ends_at:   DateTime
  derive cancel_deadline: DateTime = self.starts_at - cancellation_notice
  lifecycle status { ... }
}
```

- `field name: Type unique` — `unique` を付けたフィールドには
  「同エンティティの全インスタンス間で値が一意」という rule が自動生成される。
  エラーコードは `<ENTITY>_<FIELD>_NOT_UNIQUE` を大文字化して機械的に生成する
  (例 `USER_EMAIL_NOT_UNIQUE`)。
- `derive` — 自インスタンスから計算される読み取り専用属性。格納されない。
  式は `self`・param・calc・`now` を参照できる(`now` 参照時は評価文脈依存になる)。
  derive 間の参照は非循環でなければならない(W-08)。
- 全インスタンスは処理系が付与する内部 ID を持つ。仕様からは直接見えず、
  `ref` の同一性比較 (`==` `!=`) と集合の全順序(§4.2)にのみ使われる。
- `entity E external { ... }` — **external エンティティ**は、その生成・更新のライフサイクルが
  この仕様セットの範囲外(マスタ管理・アカウント発行等)であることを宣言する。
  effect からの `create` / `update` / `transition` の対象にできない(W-10)。
  読み取り・参照は自由。網羅性検査 C-03 の対象外になる。

#### lifecycle(状態機械)

```fspec
lifecycle status {
  initial #active
  state #active
  state #cancelling { doc "解約予約済み。期間末まで利用可" }
  state #ended
  transition cancel: #active -> #cancelling {
    error CANNOT_CANCEL_SUBSCRIPTION
    effect { ... }
  }
  transition terminate: #cancelling -> #ended {
    at self.current_period_end
  }
}
```

- lifecycle はエンティティにつき最大 1 つ。宣言名(上例 `status`)がそのまま
  状態フィールド名になる。状態型はこの lifecycle 固有の匿名 enum であり、
  値は ATOM で書く。
- 状態フィールドは `create` で**指定できない**(常に `initial` で初期化。W-09)。
  `update` でも書けない。状態を変えられるのは `transition` 文だけ。
- `transition name: #src -> #dst { ... }` の節:
  - `at <DateTime式>` — **タイマー遷移**。インスタンスが `#src` に入った時点
    (生成で `initial` に入る場合を含む)で式を評価して発火時刻を予約する。
    発火時、まだ `#src` に居れば遷移を実行する。居なければ予約は破棄。
    自己遷移(`#a -> #a`)は許され、再突入として再予約される。
  - `when <Bool式>` — ガード。偽なら遷移は失敗する。
  - `error CODE` — 対象が `#src` に居ない/ガードが偽のときのエラーコード。
    省略時は `<ENTITY>_INVALID_TRANSITION` が自動生成される。
  - `effect { ... }` — 遷移成功時に実行される effect 文列(§5.8)。
    状態書き換え後に実行される。
- 遷移は behavior の effect 文 `transition <path>.<遷移名>` から、
  または `at` によるタイマーから起動される。それ以外に状態が変わる経路はない。

### 5.6 rule(不変条件)

```fspec
rule no_double_booking on Reservation as r {
  doc "同一会議室で時間帯が重なる確定予約は複数存在してはならない"
  when r.status == #confirmed
  require is_empty(
    select o in conflicting_reservations(r.room, r.starts_at, r.ends_at)
    where o != r)
  on violation reject error RESERVATION_OVERLAP
  overridable by system_admin
}
```

- rule は対象エンティティの**全インスタンスについて常に成り立つべき不変条件**。
  `when` は適用条件(省略時は常に適用)、`require` が本体。
  意味論: 全インスタンス `r` について `when(r) implies require(r)`。
- **検査タイミング**: behavior またはタイマー遷移の effect が完了した時点
  (コミット直前)で、**書き込み集合**(その実行で create / update / transition された
  インスタンス)に属する各インスタンスに対し、そのエンティティを対象とする全 rule を
  評価する。1 件でも違反があれば実行全体を**原子的に棄却**し、違反を
  (rule 名昇順, インスタンス ID 昇順)で全件報告する。
- 検査対象は書き込まれたインスタンスに限る。したがって「他インスタンスとの関係」を
  述べる rule は、**どちら側のインスタンスを書き込んでも検出できるよう対称に**書くこと
  (上例の overlap 述語は対称)。この規約は L-01 として既知の限界に記す。
- `on violation reject error CODE` — 違反時は棄却し、このコードで報告する。
  違反時の扱いはこの 1 種に集約した(RATIONALE §3.4)。
- `overridable by <actor>...` — この rule の効果を実質的に無効化する behavior
  (`overrides` 節を持つもの、§5.8)を持ってよいアクターの列挙。**rule 自体の緩和では
  ない**(rule は常に検査される)。強制上書きは「先に衝突を解消する effect を持つ
  behavior」としてモデル化する(RATIONALE §3.5)。

rule は behavior から参照**しない**。どの behavior にどの rule が適用されるかは、
effect の書き込み集合から**コンパイラが導出**する(§7 C-04、WORKFLOW D-04)。
これが「同一制約を二度書かない」ことの構造的保証である。

### 5.7 calc(純関数)

```fspec
calc proration_charge(sub: ref Subscription, new_plan: ref Plan, at: DateTime) -> Money =
  let remaining_days = days_between(at, sub.current_period_end) in
  let total_days = days_between(sub.current_period_start, sub.current_period_end) in
  round((new_plan.monthly_fee - sub.plan.monthly_fee) * remaining_days / total_days, #half_up)
```

- 名前付き純関数。仕様内で再利用される述語・計算・導出集合の**単一定義点**。
- 返り値型に `set<ref E>` を許す(検索条件の共有に使う。例: `conflicting_reservations`)。
- 本体は式のみ(effect 不可)。再帰不可(W-08)。

### 5.8 behavior(振る舞いの単位)

behavior は「利用者から見た操作 1 つ」= 認可・入力・事前条件・効果・出力の束。
effect を持つものが**アクション**、`output` のみのものが**クエリ**である。

```fspec
behavior cancel_reservation {
  doc "予約を取り消す。キャンセル期限後の取消は全額のキャンセル料を課金する"
  allow member     where input.target.owner == caller
  allow dept_admin where input.target.owner.department == caller.department
  allow system_admin
  input { target: ref Reservation }
  require now < input.target.starts_at error RESERVATION_ALREADY_STARTED
  effect {
    transition input.target.cancel
    let fee = cancellation_charge(input.target)
    when fee > money(0) {
      create Charge {
        subscription = the(active_subscriptions(input.target.owner)),
        amount = fee,
        reason = #late_cancellation,
        charged_at = now
      }
    }
  }
}
```

節(この順で書く。文法上も順序固定):

1. `doc` / `trace` — メタ情報(非規範/上流要件 ID)。
2. `allow <actor> [where <Bool式>]` — 1 つ以上必須(W-06)。`where` は `caller` と
   `input` を参照できるスコープ条件。**いずれかの節が成立すれば許可**(OR)。
   全て不成立なら組み込みエラー `FORBIDDEN`。
3. `input { name: Type, ... }` — 入力レコード。省略時は入力なし。
   `ref E` 型の入力は存在するインスタンスへの参照であることが入力検証で保証される。
4. `overrides <rule名>` — この behavior が指名した rule の禁止効果を迂回する
   (= 通常なら violation になる状況を、effect で先に解消してから実行する)ことの宣言。
   対象 rule の `overridable by` に、この behavior の全 allow アクターが含まれること(W-07)。
   意味論上は**メタデータ**であり、rule の検査は通常どおり行われる(多重防御)。
5. `audit` — 実行を監査ログに記録すべきことの宣言。`overrides` を持つ behavior は
   `audit` 必須(W-07)。
6. `let x = <式>` / `require <Bool式> error CODE` — 宣言順に評価する事前節。
   `require` が偽なら、そのコードで棄却(最初の失敗で停止)。
7. `effect { <文>* }` — 効果。文は次の 5 種:
   - `let x = <式 | create E { f = e, ... }>` — 束縛。effect 直下の let は
     `output` から参照可能。`foreach` / `when` ブロック内の let はブロックローカル。
   - `create E { f = e, ... }` — 生成。lifecycle フィールドと derive を除く全フィールドに
     初期値を与える(optional フィールドは `none` を明示する。W-09)。
   - `update <path> { f = e, ... }` — 更新。1 文内の右辺はすべて**文更新前**の状態で
     評価される(同時代入)。
   - `transition <path>.<遷移名>` — 状態遷移の起動。
   - `foreach x in <集合式> { <文>* }` — ID 昇順で反復。
   - `when <Bool式> { <文>* } [otherwise { <文>* }]` — 条件分岐。
   文は**逐次実行**され、後続の文・式は先行する書き込みを観測する
   (`update` の同一文内のみ同時代入)。
8. `output <式>` — 返り値。クエリ behavior では必須、アクションでは任意。

### 5.9 エラーコード

エラーコードは宣言不要。`error CODE` の出現箇所と自動生成(`FORBIDDEN`、
`INVALID_INPUT`、unique 違反、`_INVALID_TRANSITION`)からカタログが導出される。
同じコードを複数箇所で使うことは「同じ意味の失敗」の共有であり許される。
コードと利用者向け文言の対応表は設計層の成果物とし、仕様には持たない(RATIONALE §4.3)。

## 6. 実行時セマンティクス

### 6.1 評価文脈

behavior・タイマー・calc の評価は文脈 `(db, now, caller, input, params)` の純関数である。
`db` はエンティティ外延のスナップショット(順序付き)。同じ文脈からは常に同じ結果が
得られる。LLM・乱数・外部 I/O は評価に一切関与しない。

### 6.2 behavior 実行パイプライン

1. **入力検証** — input の型・参照存在検査。失敗 → `INVALID_INPUT`。
2. **認可** — allow 節を宣言順に評価。最初に成立した節で許可。全滅 → `FORBIDDEN`。
3. **事前節** — let / require を宣言順に評価。require 失敗 → そのコード。
4. **effect** — 文を逐次実行。`transition` の失敗(状態不一致・ガード偽)は
   その遷移のエラーコードで棄却。`the(s)` は `|s| == 1` でなければ評価エラー
   `EVAL_ERROR`(仕様は require か rule で事前に単一性を保証すべき。C-08 が警告する)。
5. **rule 検査** — §5.6 のとおり書き込み集合に対して全適用 rule を評価。
   違反があれば全体を棄却し全違反を報告。
6. **コミットと output** — 書き込みを確定し、output 式を評価して返す。

棄却時(どの段階でも)、書き込みは一切残らない(原子性)。

### 6.3 タイマー遷移

- インスタンスが状態 `#s` に入るたび、`#s` を遷移元とする `at` 付き遷移それぞれについて
  `at` 式を評価し、(インスタンス, 遷移, 発火時刻) を予約する。
- 発火時は `now = 予約された発火時刻` として effect と rule 検査を評価する
  (実際の実行が遅延しても結果は同じ = 決定論)。`caller` と `input` は存在しない
  (タイマー effect から参照すると型エラー。W-11)。
- 発火時に遷移元状態に居なければ何もしない。ガード偽・rule 違反の場合、遷移は起こらず
  ランタイムは運用アラート `TIMER_CONFLICT` を記録する(仕様検査 C-07 がこのリスクを
  静的に警告する)。同時刻の予約は (エンティティ名, インスタンス ID, 遷移名) の
  辞書順で逐次処理する。

### 6.4 rule 検査の走査範囲

書き込み集合の各インスタンス `x` について、`x` のエンティティを対象とする全 rule を
`r := x` で評価する。他インスタンスは再評価しない(対称述語規約、§5.6)。

### 6.5 決定論の総括

- 集合の列挙順: 内部 ID 昇順(§4.2)。
- 違反の報告順: (rule 名, インスタンス ID) 昇順。
- 事前節・effect・allow: 宣言順。
- 数値: 有理数演算+明示丸めのみ。
- タイマー: `now = 発火予定時刻`、同時刻は辞書順。

以上により、パース・型検査・導出・実行時判定のすべてが入力に対して一意である。

## 7. 整合性検査(W)と網羅性検査(C)

コンパイラ(`fspec check`)は以下を検査する。W はエラー(コンパイル失敗)、C は
網羅性レポート(既定はエラー。理由を添えて個別に抑止指定できる)。

**W: 整合性**

- W-01 名前の一意性(§1 の名前空間規則)と全参照の解決可能性。
- W-02 型検査(Money の丸め検査 §3.2、optional narrowing §3.4、ATOM 解決 §4.3 を含む)。
- W-03 `currency` がちょうど 1 つ、`actors` がちょうど 1 つ。
- W-04 `actor` 型フィールドが仕様セット全体でちょうど 1 つ(principal の一意性)。
- W-05 lifecycle: `initial` が宣言済み状態、遷移の両端が宣言済み状態。
- W-06 behavior に allow が 1 つ以上。
- W-07 `overrides` の対象 rule に `overridable by` があり、behavior の全 allow アクターが
  その列挙に含まれる。かつ behavior に `audit` がある。逆に `overridable by` を持つ rule に
  対応する `overrides` behavior が存在しない場合は C 警告(C-06)。
- W-08 calc・derive の参照グラフが非循環。
- W-09 `create` が lifecycle・derive 以外の全フィールドを初期化し、lifecycle フィールドを
  指定していない。`update` が lifecycle・derive フィールドを書いていない。
- W-10 external エンティティへの create / update / transition がない。
- W-11 タイマー遷移の effect / `at` / `when` が `caller` / `input` を参照しない。

**C: 網羅性**(「網羅できているか判定できない」への構造的回答)

- C-01 全状態が `initial` から遷移列で到達可能。
- C-02 全遷移に起動経路がある(いずれかの behavior / 遷移 effect から参照される、
  または `at` を持つ)。
- C-03 external でない全エンティティに、それを create する behavior / effect が存在する。
- C-04 全 rule が少なくとも 1 つの behavior の書き込み集合に掛かる(死んだ rule の検出)。
- C-05 全アクターに 1 つ以上の allow がある。全 calc / param / enum が参照されている。
- C-06 `overridable by` に対応する `overrides` behavior が存在する。
- C-07 タイマー遷移の effect 後に違反しうる rule の静的候補列挙(TIMER_CONFLICT リスク)。
- C-08 `the(s)` の単一性が require / rule で保護されていない使用箇所。

## 8. 依存グラフと影響分析

**依存は書かない。導出する。**(RATIONALE §3.3)

- コンパイラは解決済み AST から参照辺 `A → B`(A の定義が B の名前を使用)を全て収集
  する。ノードは全宣言と entity メンバー(field / derive / transition)。加えて暗黙辺:
  - rule → 対象エンティティ
  - behavior → その書き込み集合に掛かる rule(§5.6 の導出)
  - behavior → effect が起動する transition
- `impact(X)` = X への参照辺の逆方向推移閉包。出力は修飾名の辞書順。
  「X を変えたとき見直すべき宣言の完全な上界」を与える。
- 例: `Reservation.cancel_deadline` を変更 → `cancellation_charge`(参照)→
  `cancel_reservation`(参照)が影響下、と機械的に列挙される。

## 9. コンパイル済み IR とランタイム API

### 9.1 SpecIR

`fspec build` は仕様セットを単一の JSON(**SpecIR**)にコンパイルする。SpecIR が
Web アプリケーションに同梱・配信されるランタイム表現である。テキスト構文の情報を
すべて保持し(doc 含む)、名前解決・型検査済みである。

```jsonc
{
  "fspec_ir": "1.0",
  "currency": "JPY",
  "params":   { "cancellation_notice": { "type": "Duration", "default": "PT24H" } },
  "actors":   { "member": {"doc": "一般利用者"}, "dept_admin": {}, "system_admin": {} },
  "principal": { "entity": "User", "field": "role" },
  "enums":    { "ChargeReason": ["period_fee", "proration", "late_cancellation"] },
  "entities": {
    "Reservation": {
      "external": false,
      "fields":  { "room": {"type": {"ref": "Room"}}, "...": {} },
      "derives": { "cancel_deadline": { "type": "DateTime", "expr": { "...": {} } } },
      "lifecycle": {
        "field": "status", "initial": "confirmed",
        "states": ["confirmed", "cancelled", "system_cancelled", "overridden"],
        "transitions": {
          "cancel": { "from": "confirmed", "to": "cancelled",
                      "error": "CANNOT_CANCEL_RESERVATION" }
        }
      }
    }
  },
  "rules":     { "no_double_booking": { "on": "Reservation", "var": "r",
                 "when": {}, "require": {}, "error": "RESERVATION_OVERLAP",
                 "overridable_by": ["system_admin"] } },
  "calcs":     { "...": {} },
  "behaviors": { "...": {} },
  "derived": {
    "refs":          { "cancel_reservation": ["Reservation", "Reservation.cancel", "cancellation_charge"] },
    "impact":        { "Reservation.cancel_deadline": ["cancellation_charge", "cancel_reservation"] },
    "rules_by_behavior": { "create_reservation": ["no_double_booking", "reservation_time_valid", "reservation_within_subscription"] },
    "error_catalog": { "cancel_reservation": ["FORBIDDEN", "RESERVATION_ALREADY_STARTED", "CANNOT_CANCEL_RESERVATION", "..."] },
    "timers":        [ { "entity": "Subscription", "transition": "renew" } ]
  }
}
```

式は型注釈付き AST ノードとして符号化する:
`{"op": "call", "fn": "overlaps", "args": [...]}`、
`{"op": "cmp", "cmp": "<", "lhs": {...}, "rhs": {...}}`、
`{"op": "select", "var": "o", "src": {...}, "where": {...}}` 等。
ノード種別は表面文法の式形と 1:1 対応(全列挙は build 出力の JSON Schema に含める)。

### 9.2 ランタイム API(参照実装の表面)

```ts
const spec = loadSpec(irJson, { params, dbAdapter });

// 画面制御・認可: この caller はこの操作を実行しうるか(allow 節のみ評価)
spec.can("cancel_reservation", { caller, input, now }): boolean

// 事前検証: require + 適用 rule を実行せずに評価(フォームのライブバリデーション)
spec.validate("create_reservation", { caller, input, now }): Violation[]

// 実行: パイプライン §6.2 を dbAdapter のトランザクション内で実行
spec.execute("change_plan", { caller, input, now }): Result

// 静的情報: エラーカタログ・入力スキーマ・権限マトリクス(UI 生成・API 文書化の根拠)
spec.errorCatalog("cancel_reservation"): Code[]
spec.inputSchema("create_reservation"): JsonSchema
spec.allowMatrix(): Matrix

// 計算の単体評価(請求プレビュー等)
spec.calc("proration_charge", [subRef, planRef, at], { now }): Value

// タイマー: 予約すべき (instance, transition, fireAt) の列挙
spec.pendingTimers(instanceRef): Timer[]

// 影響分析
spec.impact("Reservation.cancel_deadline"): QualifiedName[]
```

`dbAdapter` はエンティティ外延の読み書き(ID 順列挙・トランザクション)を提供する
アプリ側実装。仕様の評価自体は §6.1 のとおり純粋であり、同じスナップショットに対して
常に同じ結果を返す。

## 10. 文法定義(EBNF 全文)

トークン(IDENT, TYPENAME, CODE, ATOM, INT, DECIMAL, STRING, DURATION)は §2.1。
`(* *)` はコメント。終端記号は `"..."`。

```ebnf
(* ---------- ファイル ---------- *)
File           ::= ModuleDecl TopDecl* ;
ModuleDecl     ::= "module" IDENT ;
TopDecl        ::= CurrencyDecl | ParamDecl | EnumDecl | ActorsDecl
                 | EntityDecl | RuleDecl | CalcDecl | BehaviorDecl ;

CurrencyDecl   ::= "currency" CODE ;
ParamDecl      ::= "param" IDENT ":" Type "=" Literal MetaBlock? ;
EnumDecl       ::= "enum" TYPENAME "{" ATOM ("," ATOM)* "}" ;
ActorsDecl     ::= "actors" "{" ActorDef+ "}" ;
ActorDef       ::= IDENT MetaBlock? ;

MetaBlock      ::= "{" Meta "}" ;
Meta           ::= DocClause? TraceClause* ;
DocClause      ::= "doc" STRING ;
TraceClause    ::= "trace" STRING ;

(* ---------- entity ---------- *)
EntityDecl     ::= "entity" TYPENAME "external"? "{" Meta EntityMember* "}" ;
EntityMember   ::= FieldDecl | DeriveDecl | LifecycleDecl ;
FieldDecl      ::= "field" IDENT ":" Type "unique"? ;
DeriveDecl     ::= "derive" IDENT ":" Type "=" Expr ;
LifecycleDecl  ::= "lifecycle" IDENT "{" "initial" ATOM StateDecl+ TransitionDecl* "}" ;
StateDecl      ::= "state" ATOM MetaBlock? ;
TransitionDecl ::= "transition" IDENT ":" ATOM "->" ATOM TransBlock? ;
TransBlock     ::= "{" Meta AtClause? WhenClause? ErrorClause? EffectClause? "}" ;
AtClause       ::= "at" Expr ;
WhenClause     ::= "when" Expr ;
ErrorClause    ::= "error" CODE ;
EffectClause   ::= "effect" Block ;

(* ---------- rule / calc ---------- *)
RuleDecl       ::= "rule" IDENT "on" TYPENAME "as" IDENT
                   "{" Meta WhenClause? "require" Expr
                       "on" "violation" "reject" "error" CODE
                       Overridable? "}" ;
Overridable    ::= "overridable" "by" IDENT ("," IDENT)* ;

CalcDecl       ::= "calc" IDENT "(" ParamList? ")" "->" Type "=" Expr ;
ParamList      ::= Param ("," Param)* ;
Param          ::= IDENT ":" Type ;

(* ---------- behavior ---------- *)
BehaviorDecl   ::= "behavior" IDENT "{" Meta AllowClause+ InputClause?
                   OverridesClause? AuditClause? PreClause*
                   EffectClause? OutputClause? "}" ;
AllowClause    ::= "allow" IDENT ("where" Expr)? ;
InputClause    ::= "input" "{" Param ("," Param)* "}" ;
OverridesClause::= "overrides" IDENT ;
AuditClause    ::= "audit" ;
PreClause      ::= "let" IDENT "=" Expr
                 | "require" Expr "error" CODE ;
OutputClause   ::= "output" Expr ;

(* ---------- effect 文 ---------- *)
Block          ::= "{" Stmt* "}" ;
Stmt           ::= "let" IDENT "=" Rhs
                 | CreateExpr
                 | "update" Path "{" FieldInit ("," FieldInit)* "}"
                 | "transition" Path
                 | "foreach" IDENT "in" Expr Block
                 | "when" Expr Block ("otherwise" Block)? ;
Rhs            ::= CreateExpr | Expr ;
CreateExpr     ::= "create" TYPENAME "{" FieldInit ("," FieldInit)* "}" ;
FieldInit      ::= IDENT "=" Expr ;
Path           ::= ("self" | "caller" | "input" | IDENT) ("." IDENT)* ;

(* ---------- 型 ---------- *)
Type           ::= "optional"? BaseType ;
BaseType       ::= "Bool" | "Int" | "Decimal" | "String" | "DateTime"
                 | "Duration" | "Money" | "actor"
                 | "ref" TYPENAME | TYPENAME | "set" "<" BaseType ">" ;

(* ---------- 式 ---------- *)
Expr           ::= OrExpr ("implies" Expr)? ;
OrExpr         ::= AndExpr ("or" AndExpr)* ;
AndExpr        ::= NotExpr ("and" NotExpr)* ;
NotExpr        ::= "not" NotExpr | CmpExpr ;
CmpExpr        ::= AddExpr (CmpOp AddExpr)? ;
CmpOp          ::= "==" | "!=" | "<" | "<=" | ">" | ">=" ;
AddExpr        ::= MulExpr (("+" | "-") MulExpr)* ;
MulExpr        ::= UnaryExpr (("*" | "/") UnaryExpr)* ;
UnaryExpr      ::= "-" UnaryExpr | PostfixExpr ;
PostfixExpr    ::= Primary ("." IDENT)* ;
Primary        ::= Literal
                 | "true" | "false" | "none"
                 | "caller" | "now" | "self" | "input"
                 | ATOM
                 | IDENT ("(" ArgList? ")")?
                 | TYPENAME
                 | SelectExpr | SumExpr | IfExpr | LetExpr
                 | "(" Expr ")" ;
SelectExpr     ::= "select" IDENT "in" Expr "where" Expr ;
SumExpr        ::= "sum" "(" IDENT "in" Expr "," Expr ")" ;
IfExpr         ::= "if" Expr "then" Expr "else" Expr ;
LetExpr        ::= "let" IDENT "=" Expr "in" Expr ;
ArgList        ::= Expr ("," Expr)* ;
Literal        ::= INT | DECIMAL | DURATION ;
```

構文解析上の注記(曖昧さの排除):

- `if` / `let ... in` / `select` の末尾式・`where` 式は右に貪欲。ブロック開始 `{` は
  式を構成しないため、`foreach x in <式> {`・`when <式> {` は一意に区切られる。
- 式中の `let ... in` と effect 文の `let`(`in` なし)は出現位置で区別される。
- `Primary` の TYPENAME はエンティティ外延(`set<ref E>`)。enum 名を式の位置に
  書くのは型エラー(W-02)。
- 比較演算子は非結合(§4.1)。この文法は 2 トークン先読みの再帰下降で決定的に
  解析できる。

## 11. 予約語・組み込み一覧

**予約語**(IDENT として使用不可):
`module currency param enum actors entity external field unique derive lifecycle
initial state transition rule on as when at require violation reject error
overridable by calc behavior allow where input overrides audit let in effect
output create update foreach otherwise select sum if then else implies and or
not true false none caller now self optional ref set doc trace`

**型名予約**: `Bool Int Decimal String DateTime Duration Money actor`

**組み込み関数**:

| シグネチャ | 意味 |
|---|---|
| `exists(set<T>) -> Bool` | 非空 |
| `is_empty(set<T>) -> Bool` | 空 |
| `count(set<T>) -> Int` | 要素数 |
| `the(set<T>) -> T` | 唯一の要素。要素数 ≠ 1 は評価エラー(C-08 参照) |
| `money(Int) -> Money` | 通貨最小単位での金額リテラル |
| `round(Money~, #half_up\|#half_even\|#floor\|#ceil) -> Money` | 通貨最小単位への丸め |
| `add_months(DateTime, Int) -> DateTime` | 暦月加算(月末丸め、§3.3) |
| `days_between(DateTime, DateTime) -> Int` | `floor((b - a) / 24h)` |
| `hours_between(DateTime, DateTime) -> Decimal` | `(b - a) / 1h` の厳密値 |

**組み込みエラーコード**: `FORBIDDEN INVALID_INPUT EVAL_ERROR`
(および自動生成: `<ENTITY>_<FIELD>_NOT_UNIQUE`、`<ENTITY>_INVALID_TRANSITION`)
