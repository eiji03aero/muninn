# WORKFLOW — FSPEC 仕様から基本設計・詳細設計を導出する

このドキュメントは「FSPEC で書かれた仕様から、下流の設計をどう導出するか」の手順書である。
**ステージ 1（仕様 → 基本設計の入力）は LLM の推論を一切含まない機械変換** であり、
`fspec` コマンドの出力がそのまま基本設計の入力になる。

```
  要件               仕様(FSPEC)            基本設計                詳細設計
 ───────           ─────────────         ──────────             ──────────
 REQ_xx  ──trace──▶  *.fspec  ──[S1]──▶  13 種の生成物  ──[S2]──▶  実装単位
                        │       機械変換        │        設計判断      │
                        │                       │       (DDR に記録)   │
                        └──────── fspec impact / diff で全段を貫通 ─────┘
```

---

## 1. ツールチェーン

| コマンド | 出力 | 用途 |
|---------|------|------|
| `fspec check <dir>` | 検査結果（C-01〜C-29, C-DUP, C-COV-*） | 仕様が受け入れ可能か |
| `fspec build <dir> -o ir.json` | FSPEC IR | ランタイムと下流生成の唯一の入力 |
| `fspec coverage ir.json` | 網羅性レポート | 要件・状態・権限・エラーの取りこぼし検出 |
| `fspec derive <artifact> ir.json` | §3 の各生成物 | 基本設計の入力 |
| `fspec impact <node-id> ir.json` | 影響ノード集合 | 変更前の影響範囲把握 |
| `fspec diff old.json new.json` | 変更ノード + 波及集合 + BREAKING 判定 | 変更時の再設計・再テスト範囲 |
| `fspec run-scenarios ir.json` | scenario の実行結果 | 仕様自身の回帰テスト |

---

## 2. ステージ 0 — 仕様の受け入れ

基本設計に進んでよいのは、次を **すべて** 満たすときだけ。CI のゲートにする。

```
fspec check example/        # ERROR 0 件
fspec run-scenarios ir.json # 全 scenario pass
fspec coverage ir.json      # 下表の全項目が 100% または明示的な除外理由つき
```

`fspec coverage` が出す表（例: 実証課題の仕様に対して）:

| 観点 | 指標 | 判定基準 |
|------|------|---------|
| 要件充足 | `traces` されていない `requirement` の数 | 0（C-COV-1, ERROR） |
| 状態網羅 | 到達不能な状態 / 出遷移のない非終端状態 / トリガのない遷移 | 各 0（C-15〜C-17, ERROR） |
| 権限網羅 | `grant` に現れない `capability` の数 | 0（C-COV-2） |
| 属性利用 | 誰にも読まれず書かれもしない `entity` フィールド | 0（C-COV-3） |
| エラー到達 | どの `on_violation` にも現れない `error` | 0（C-COV-4） |
| ロール到達 | どの `feature` からも到達できない `actor` | 0（C-COV-5） |
| 制約の一意性 | 正規化 `assert` が一致する rule 対 | 0（C-DUP, ERROR） |
| 具体例 | `scenario` を持たない `requirement` | 報告のみ（レビュー材料） |

「網羅できているか判定できない」という従来の不満は、この表が代替する。
仕様が不完全なら、そもそもステージ 1 に進めない。

---

## 3. ステージ 1 — 仕様から機械的に得られる基本設計の入力

`fspec derive` が生成する 13 種。**すべて決定的**で、同じ IR からは常に同じ出力になる。
各生成物には由来ノードの完全修飾 ID が埋め込まれ、ステージ 3 の影響追跡に使われる。

### 3.1 ドメインモデル（`fspec derive domain`）

| 入力 | 出力 |
|------|------|
| `entity` | 概念、属性、型、不変性（immutable）、導出属性 |
| フィールドの `Ref<E>` / `List<Ref<E>>` / `?` | 関連と多重度 |
| `enum` | 値集合 |
| `param` | 設定可能な定数（テナント別かどうかを含む） |

実証課題では 8 エンティティ・2 列挙・4 パラメータ。関連は次のとおり導出される。

```
Reservation ──room──▶ Room            (多対1, 必須, immutable)
Reservation ──organizer──▶ User       (多対1, 必須, immutable)
Reservation ──department──▶ Department(導出: organizer.department)
Subscription ──department──▶ Department(多対1, 必須, immutable)
Subscription ──plan──▶ Plan           (多対1, 必須)
Invoice ──department──▶ Department    (多対1, 必須, immutable)
InvoiceLine ──invoice──▶ Invoice      (多対1, 必須, immutable)
User ──department──▶ Department       (多対1, 必須)
```

### 3.2 権限マトリクス（`fspec derive authz`）

`indexes.capabilities_by_actor` をそのまま表にする。実証課題の出力:

| capability | Member | DeptAdmin | SysAdmin |
|-----------|--------|-----------|----------|
| C_reserve | S_own | S_own | S_own, S_all |
| C_view_reservation | S_own | S_own, S_dept | S_own, S_dept, S_all |
| C_view_room_availability | S_all | S_all | S_all |
| C_cancel_reservation | S_own | S_own, S_dept | S_own, S_dept, S_all |
| C_override_conflict | — | — | S_all |
| C_view_subscription | — | S_dept | S_dept, S_all |
| C_change_plan | — | S_dept | S_dept, S_all |
| C_cancel_subscription | — | S_dept | S_dept, S_all |
| C_view_invoice | — | S_dept | S_dept, S_all |
| C_waive_charge | — | — | S_all |
| C_manage_room | — | — | S_all |
| C_manage_user | — | — | S_all |

基本設計側の作業は「この表を実装する認可ミドルウェアの形を決める」ことだけであり、
表そのものを作り直す必要はない。

### 3.3 機能一覧（`fspec derive features`）

feature ごとに、最小アクタ・権限・入力・前提条件・不変条件・発生しうるエラー・発行イベント・
状態遷移を、すべて **導出済み** の形で出す。例（抜粋）:

| feature | actor | capability | 前提条件 (P2) | 不変条件 (P4) | エラー | 遷移 | イベント |
|---------|-------|-----------|--------------|--------------|--------|------|---------|
| `reservation.F_create_reservation` | Member | C_reserve | R_actor_must_be_active, R_reservation_not_in_past, R_room_must_be_bookable, R_reservation_requires_active_subscription | R_reservation_period_valid, R_no_double_booking, R_reservation_within_service_window, R_plan_quota_active_reservations, R_plan_advance_limit | E_FORBIDDEN, E_INACTIVE_USER, E_INVALID_PERIOD, E_PERIOD_IN_PAST, E_ROOM_NOT_BOOKABLE, E_ROOM_CONFLICT, E_NO_ACTIVE_SUBSCRIPTION, E_BEYOND_SERVICE_END, E_RESERVATION_QUOTA_EXCEEDED, E_ADVANCE_LIMIT_EXCEEDED | — (create) | Ev_reservation_created, Ev_reservation_overridden |
| `reservation.F_cancel_reservation` | Member | C_cancel_reservation | R_actor_must_be_active, R_cancel_before_deadline | （同上・when で不適用になるものを含む） | E_FORBIDDEN, E_INACTIVE_USER, E_LATE_CANCELLATION(notice) | T_cancel | Ev_reservation_cancelled, Ev_fee_waived |
| `billing.F_change_plan` | DeptAdmin | C_change_plan | R_actor_must_be_active, R_plan_change_requires_active_subscription, R_plan_change_must_differ | R_subscription_period_non_empty, R_plan_quota_active_reservations, R_plan_advance_limit, R_line_only_on_open_invoice | E_FORBIDDEN, E_SUBSCRIPTION_NOT_ACTIVE, E_SAME_PLAN, E_PLAN_LIMIT_EXCEEDED, E_INVOICE_ALREADY_ISSUED | — | Ev_plan_changed |

**この表を人手で書かない**ことが重要である。エラー一覧が仕様と食い違う典型的な事故が構造的に起きない。

### 3.4 状態遷移表（`fspec derive states`）

`indexes.transitions_by_state` から生成。トリガ列は `effect` の `transition` 文から導出されたもの。

**Reservation**

| from | transition | to | 起こす主体 | ガード |
|------|-----------|-----|-----------|-------|
| Confirmed | T_cancel | Cancelled | `F_cancel_reservation`, `R_no_double_booking`(override), `R_reservation_within_service_window`(compensate) | — |
| Confirmed | T_complete | Completed | `J_complete_past_reservations` | — |

**Subscription**

| from | transition | to | 起こす主体 | ガード |
|------|-----------|-----|-----------|-------|
| Active | T_sub_request_cancel | Cancelling | `F_cancel_subscription` | — |
| Cancelling | T_sub_resume | Active | `F_resume_subscription` | — |
| Cancelling | T_sub_end | Ended | `J_close_billing_period` | — |

**Invoice**

| from | transition | to | 起こす主体 | ガード |
|------|-----------|-----|-----------|-------|
| Open | T_inv_issue | Issued | `J_close_billing_period` | — |

### 3.5 制約台帳（`fspec derive rules`）

rule ごとに: 種別・適用対象・適用条件・述語・違反時の扱い（文脈別）・上書き権限・再検査対象・由来要件。
**同じ制約が複数行に現れることはない**（C-DUP が保証）。
基本設計はこの台帳の各行に対して「どこで実装するか（DB 制約 / アプリ層 / バッチ）」を決める。

### 3.6 エラー ↔ プロトコル対応表（`fspec derive errors`）

`error.class` から既定の HTTP ステータスへ写す。この対応表は基本設計の決定事項であり、
既定値を変える場合は DDR（§4）に記録する。

| class | 既定 HTTP | 備考 |
|-------|----------|------|
| `invalid_input` | 400 | `blames` を項目エラーとして返す |
| `forbidden` | 403 | |
| `not_found` | 404 | |
| `conflict` | 409 | |
| `precondition_failed` | 422 | |
| `quota_exceeded` | 409 | 課金導線に載せる場合は 402 に変更（要 DDR） |
| `internal` | 500 | |

`severity: notice` のエラーは HTTP ステータスにならず、成功レスポンスの `notices[]` に載る。
実証課題では `E_LATE_CANCELLATION` と `E_RESERVATION_ENDED_BY_CANCELLATION` がこれに当たる。
**「操作は成功したが課金が発生した」を表現する経路がプロトコル上に確保される。**

### 3.7 API 候補一覧（`fspec derive api`）

既定テンプレート（決定的。基本設計で変更可、変更は DDR）:

| 条件 | 生成される候補 |
|------|---------------|
| `kind: command` かつ `draft E` を持つ | `POST /{plural(E)}` |
| `kind: command` かつ `subject: input.x`（`x: Ref<E>`） | `POST /{plural(E)}/{id}/{verb}` — `verb` は feature 名から `F_` と E 名を除いた語 |
| `kind: query` かつ `returns: List<Ref<E>>` | `GET /{plural(E)}` |
| `kind: query` かつその他 | `GET /{plural(E_of_first_ref_input)}/{id}/{name}` |

実証課題の出力:

| feature | メソッド | パス | 認可 | 主なエラー |
|---------|---------|------|------|-----------|
| F_create_reservation | POST | `/reservations` | C_reserve | 400/403/409/422 |
| F_cancel_reservation | POST | `/reservations/{id}/cancel` | C_cancel_reservation | 403/422 + notice |
| F_view_reservations | GET | `/reservations` | C_view_reservation (scope 自動適用) | 403 |
| F_view_room_availability | GET | `/rooms/{id}/availability` | C_view_room_availability | 403 |
| F_change_plan | POST | `/subscriptions/{id}/change_plan` | C_change_plan | 400/403/409/422 |
| F_cancel_subscription | POST | `/subscriptions/{id}/cancel` | C_cancel_subscription | 403 + notice |
| F_resume_subscription | POST | `/subscriptions/{id}/resume` | C_cancel_subscription | 403 |
| F_view_invoices | GET | `/invoices` | C_view_invoice (scope 自動適用) | 403 |
| F_view_subscription | GET | `/subscriptions` | C_view_subscription (scope 自動適用) | 403 |
| F_register_room / F_update_room / F_retire_room | POST | `/rooms`, `/rooms/{id}`, `/rooms/{id}/retire` | C_manage_room | 400/403 |
| F_change_user_role | POST | `/users/{id}/change_role` | C_manage_user | 403 |

### 3.8 画面候補と画面制御仕様（`fspec derive screens`）

FSPEC は画面を持たない。しかし **画面制御の根拠** は完全に導出できる。

| 画面要素 | 生成規則 | 実行時の参照先 |
|---------|---------|---------------|
| 一覧画面 | `kind: query` かつ `returns: List<Ref<E>>` の feature ごと | `runQuery(featureId, …)` |
| 詳細画面のアクション群 | 対象 entity の `transitions_by_state` | `availableActions(entity, self, ctx)` |
| ボタンの表示可否 | feature の `capability` × `grant` | `can(featureId, self, ctx)` |
| ボタンの活性可否と理由 | 束縛された precondition の評価結果 | `availableActions(...).blockedBy` |
| フォーム項目 | feature の `input` の型・既定値 | 型から入力コンポーネントを決定 |
| 項目エラー表示 | `on_violation` の `blames` | `validate(...).violations[].blames` |
| 確認ダイアログ | `compensate` を持つ rule が束縛されている操作 | `plan(...).notices` |
| 金額プレビュー | `derive` | `evalDerive(deriveId, args)` |

実証課題で自動的に出てくる非自明な画面要求:

- 予約取消ボタンは、**期限を過ぎていても押せる**（`compensate` であって `reject` ではないため）。
  ただし押す前に「違約金 3,000 円が発生します」を出す必要がある
  → `plan()` の `notices` に `E_LATE_CANCELLATION` が入り、金額は `D_late_cancel_fee` で先に出せる。
- 予約作成の重複エラーは、SysAdmin に対してのみ「上書きして予約する」の再送導線を出す
  → `checkRule` が `overridableBy: identity.C_override_conflict` を返し、
    それが `ctx.capabilities` に含まれるかで判定する。
- プラン変更画面には日割り差額のプレビューが必要
  → `evalDerive('billing.D_proration_delta', …)` をクライアントで実行できる（`derive` は純関数）。

### 3.9 バッチ／スケジューラ一覧（`fspec derive jobs`）

| job | 起動 | 読み | 書き | 遷移 | イベント |
|-----|------|------|------|------|---------|
| `billing.J_close_billing_period` | 毎日 03:00 (Asia/Tokyo) | Subscription, Invoice, Plan | Invoice, InvoiceLine, Subscription | T_inv_issue, T_sub_end | Ev_invoice_issued, Ev_subscription_ended |
| `reservation.J_complete_past_reservations` | 15 分ごと | Reservation | Reservation | T_complete | Ev_reservation_completed |

冪等性の要求もここから読める。`J_close_billing_period` は
`s.current_period.end <= ctx.now` を条件に `current_period` を前進させるため、
同一時刻で 2 回実行しても 2 回目は対象 0 件になる。基本設計はこの性質を維持する実装を選ぶ。

### 3.10 イベント連携一覧（`fspec derive events`）

| event | 発行元 | 購読者（`trigger: on`） |
|-------|--------|----------------------|
| Ev_reservation_created | F_create_reservation | （なし） |
| Ev_reservation_cancelled | F_cancel_reservation, R_reservation_within_service_window | （なし） |
| Ev_reservation_overridden | R_no_double_booking (override) | （なし） |
| Ev_plan_changed | F_change_plan | （なし） |
| Ev_subscription_cancelled | F_cancel_subscription | （なし） |
| Ev_subscription_ended | J_close_billing_period | （なし） |
| Ev_invoice_issued | J_close_billing_period | （なし） |
| Ev_fee_waived | R_cancel_before_deadline (override) | （なし） |
| Ev_reservation_completed | J_complete_past_reservations | （なし） |
| Ev_subscription_resumed | F_resume_subscription | （なし） |
| Ev_user_role_changed | F_change_user_role | （なし） |
| Ev_room_registered / Ev_room_updated / Ev_room_retired | F_register_room / F_update_room / F_retire_room | （なし） |

購読者が 0 のイベントは C-27 の WARN として報告される。基本設計では
「通知メール」「監査ログ」「外部会計連携」などの実装上の購読者をここに接続する。
接続先は設計事項なので仕様には書かない。

### 3.11 計算仕様とテストベクタ（`fspec derive calc`）

`derive` は純関数なので、そのまま実装単位（モジュール／関数）になる。
`scenario` の期待値からテストベクタが生成される。

| derive | シグネチャ | scenario 由来のベクタ |
|--------|-----------|---------------------|
| `D_remaining_ratio` | `(Instant, Interval<Instant>) -> Rational` | `(2026-05-11T10:00+09:00, [05-01,06-01)) = 21/31` |
| `D_proration_delta` | `(Money, Money, Rational) -> Money` | `(10000, 30000, 21/31) = 13548 JPY` / `(30000, 10000, 21/31) = -13548 JPY` |
| `D_late_cancel_fee` | `(Money, Interval<Instant>) -> Money` | `(3000 JPY, [14:00,16:00)) = 3000 JPY` |
| `D_next_period` | `(Instant) -> Interval<Instant>` | `2026-06-01T00:00+09:00 → [2026-06-01, 2026-07-01)` |

丸めモードと桁は `param` に固定されているため、サーバ実装とクライアント実装で
値が食い違うことがない（食い違ったらそれは実装バグであり仕様の曖昧さではない）。

### 3.12 同時実行制御の要求（`fspec derive concurrency`）

これは FSPEC が明示的に狙って出せるようにした生成物である。次の 2 条件のいずれかに当たる rule は、
**単純な行ロックでは守れない制約** であり、基本設計で直列化の設計が必要になる。

- `assert` がエンティティ外延に対する量化子・内包表記を含む（＝集合に対する制約）
- `recheck` を持つ（＝他エンティティの更新で破られうる）

実証課題での出力:

| rule | 直列化すべき単位 | 理由 |
|------|----------------|------|
| `R_no_double_booking` | `(room, 期間が重なる範囲)` | 同一会議室への同時予約 |
| `R_plan_quota_active_reservations` | `department` | 同時予約作成による上限超過、および契約側変更との競合 |
| `R_plan_advance_limit` | `department` | 契約側変更との競合 |
| `R_reservation_within_service_window` | `department` | 解約と予約作成の競合 |
| `R_one_open_invoice_per_department` | `department` | 期間締めの二重実行 |
| `R_cancel_before_deadline` | `department`（`the(open invoice)` のため） | 明細計上先の一意性 |

つまり実証課題の適切な直列化キーは `department` と `room` の 2 つだと機械的に判明する。
「どう直列化するか」（悲観ロック / 楽観ロック / 一意制約 / advisory lock）は基本設計の決定事項。

### 3.13 永続化候補（`fspec derive persistence`）

| 入力 | 出力 |
|------|------|
| `entity` + `key` | テーブル候補と主キー |
| `Ref<E>` フィールド | 外部キー候補 |
| `immutable: true` | 更新禁止列（アプリ制約 or トリガ） |
| `derived:` | 計算列 / 生成列の候補（実体化するかは設計判断） |
| `State<L>` | 状態列 + CHECK 制約候補 |
| 単一エンティティ内で閉じた `assert` | CHECK 制約候補（例: `R_reservation_period_valid`, `R_room_capacity_positive`） |
| 集合に対する `assert` | 一意索引 / 排他制約 / アプリ層検証の候補（例: `R_no_double_booking` → 期間 GiST 排他制約） |
| 内包表記の `where` 句に現れる列の組 | 索引候補（例: `Reservation(room, status, period)`, `Reservation(department, status)`, `Invoice(department, status)`） |

---

## 4. ステージ 2 — 基本設計で「決める」こと

仕様に書かれていないのは、書き忘れではなく **意図的に設計レイヤーに委ねた事項** である。
基本設計はこれらを決め、DDR（Design Decision Record）に記録する。DDR は必ず
**根拠となる仕様ノードの完全修飾 ID** を持つ。

```yaml
# design/ddr/0007-reservation-overlap-exclusion.yaml
id: DDR-0007
title: 予約重複の排他方式
spec_refs:
  - reservation.R_no_double_booking
  - policy.R_plan_quota_active_reservations
decision: >
  PostgreSQL の tstzrange + EXCLUDE 制約で (room_id, period) の重複を DB 層で禁止する。
  アプリ層でも同一の述語を評価し、409 を返す。DB 制約は最後の砦とする。
alternatives:
  - department 単位の advisory lock（却下: 会議室単位より粒度が粗く並行性が落ちる）
consequences:
  - 強制上書き時は既存予約の UPDATE を先に行う必要がある（同一トランザクション内で順序制約が生じる）
```

決めるべきことの一覧（仕様レイヤーに存在しないもの）:

| 領域 | 決めること |
|------|-----------|
| プロトコル | REST / GraphQL / RPC、パス命名、ページング、バージョニング |
| 永続化 | 論理・物理スキーマ、索引、正規化、マイグレーション戦略 |
| トランザクション | 境界、分離レベル、§3.12 の直列化方式、リトライ |
| 認可の実装 | ミドルウェア / デコレータ / ポリシーエンジン、scope の SQL への落とし方 |
| 画面 | 画面分割、遷移、レイアウト、文言、i18n |
| 非同期 | イベントの配送方式、購読者、順序保証、リトライと DLQ |
| 監査 | どのイベントを永続化するか、保持期間 |
| 非機能 | 性能目標、可用性、スケーリング |
| 運用 | `param` のテナント設定 UI、バッチの監視とアラート |

---

## 5. ステージ 3 — 基本設計 → 詳細設計

詳細設計は「基本設計の各要素を、実装単位まで割り付ける」段階。FSPEC から見た要点は 2 つ。

### 5.1 ランタイムに委譲する部分を確定する

FSPEC IR をアプリケーションに同梱し、§13 のランタイム API で参照する部分と、
手で実装する部分の境界を決める。推奨の切り分け:

| 関心事 | 委譲する | 手で書く |
|-------|---------|---------|
| 認可判定 | `can()` / `runQuery()` の scope フィルタ | ─ |
| 入力検証 | `validate()`（`blames` によるフィールド割当も含む） | 形式検証（メール形式など仕様外のもの） |
| 制約評価 | `checkRule()` / `plan()` | ─ |
| 金額計算 | `evalDerive()` | ─ |
| 状態遷移の可否 | `availableActions()` | ─ |
| 永続化 | ─ | `plan()` が返す差分の適用 |
| トランザクション | ─ | 境界とロック |
| 副作用（メール等） | ─ | イベント購読 |

`plan()` が差分だけを返し永続化しないのは、この境界を明確にするためである。

### 5.2 実装単位への割り付け（決定的な対応）

| 仕様ノード | 詳細設計の実装単位 |
|-----------|------------------|
| `entity` | テーブル + リポジトリ + 型定義 |
| `derive` | 純関数モジュール（サーバ／クライアント共有） |
| `feature` (command) | ユースケースクラス／ハンドラ 1 個 |
| `feature` (query) | クエリハンドラ 1 個 |
| `rule` | ランタイム委譲。ただし DB 制約に落とすものは §3.13 に従いマイグレーションにも記述 |
| `job` | スケジューラ登録 + バッチハンドラ 1 個 |
| `event` | メッセージ型定義 + 発行点 + 購読ハンドラ |
| `error` | エラー型 + プロトコル写像 + メッセージリソース |
| `scenario` | E2E／統合テスト 1 本 |

---

## 6. 変更時のワークフロー

「ある機能を変更したとき、影響を受ける他の仕様を追跡できる」を運用に落とす手順。

```
1. 仕様を編集する
2. fspec build → new.ir.json
3. fspec diff old.ir.json new.ir.json
      → Δ（ハッシュが変わったノード集合）
      → ⋃ blast(n)（再レビュー・再テストが必要なノード集合）
      → BREAKING 判定（フィールド削除 / 状態削除 / error class 変更 / capability 剥奪）
4. blast に含まれる scenario を実行して回帰確認
5. blast に含まれるノード ID を spec_refs に持つ DDR と設計成果物を洗い出す
6. 影響のある基本設計・詳細設計を更新する
```

そのために設計成果物には次の規約でノード ID を埋め込む。

- DDR: `spec_refs:` に列挙
- API 定義（OpenAPI 等）: `x-fspec-node: reservation.F_create_reservation`
- 画面設計: 画面ごとに `fspec-features: [...]`
- テストコード: テスト名またはタグに scenario ID

### 6.1 実例

「キャンセル無料期間を 24 時間から 48 時間に変える」

```
$ fspec impact common.P_cancel_free_window
policy.R_cancel_before_deadline          (param_of)
reservation.F_cancel_reservation         (applies_to)
policy.E_LATE_CANCELLATION               (raises)
billing.InvoiceLine                      (writes)
identity.C_waive_charge                  (overridden_by)
billing.D_late_cancel_fee                (calls)
scenarios.SC_cancel_before_deadline_is_free
scenarios.SC_cancel_after_deadline_charges_fee
scenarios.SC_sysadmin_waives_late_fee
scenarios.SC_member_cannot_waive_late_fee
```

影響は 1 機能・1 制約・4 具体例に閉じており、プラン変更や重複予約には波及しないと **証明できる**。
逆に、

```
$ fspec impact billing.Plan
```

は `R_plan_quota_active_reservations` と `R_plan_advance_limit` を経由して
`reservation.F_create_reservation` にまで到達する。
「プランの属性を変えると予約作成が壊れうる」という非自明な依存が、
自然言語の仕様書では決して得られない形で明示される。

---

## 7. CI パイプライン

```yaml
spec:
  - fspec check spec/                       # ERROR があれば落とす
  - fspec build spec/ -o build/ir.json
  - fspec run-scenarios build/ir.json       # 仕様の自己整合
  - fspec coverage build/ir.json --fail-on-uncovered-requirement
  - fspec diff origin/main:build/ir.json build/ir.json --report=build/impact.md
app:
  - アプリのテスト（build/ir.json を同梱してランタイムから参照）
  - impact.md に載った scenario 由来の E2E テストを必ず実行
```

`build/ir.json` はアプリケーションの成果物に同梱され、実行時に読み込まれる。
仕様とアプリの整合は「同じ IR を見ている」ことで保証される。
