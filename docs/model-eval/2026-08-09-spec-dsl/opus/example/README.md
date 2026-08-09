# 実証課題 — サブスクリプション課金つき会議室予約システム

FSPEC で記述した実際の仕様。`fspec check` / `fspec build` / `fspec run-scenarios` の入力。

## ファイル構成

| ファイル | 内容 | import する先 |
|---------|------|--------------|
| `req.fspec` | 上流要件のアンカー（REQ_01〜REQ_15） | — |
| `common.fspec` | パラメータ（タイムゾーン・キャンセル期限・違約金率・丸めモード） | — |
| `identity.fspec` | 部門・利用者・3 ロール・権限 12 個・スコープ 3 個・権限表 | req |
| `catalog.fspec` | 会議室マスタと管理機能 | req, identity |
| `billing.fspec` | プラン・契約・請求・日割り計算・月次締め | req, common, identity |
| `reservation.fspec` | 予約・状態遷移・重複禁止・強制上書き | req, common, identity, catalog |
| `policy.fspec` | **予約と課金にまたがる制約**（契約有効性・解約後の扱い・プラン上限・キャンセル期限と違約金） | 上記すべて |
| `scenarios.fspec` | 実行可能な具体例 20 本 + 初期状態 2 種 | すべて |
| `ir/excerpt.ir.json` | コンパイル結果（IR）の抜粋 | — |

依存の向きは `req → common → identity → catalog → billing → reservation → policy → scenarios`。
`reservation` は `billing` を知らず、`billing` も `reservation` を知らない。
両者の結合はすべて `policy` を通る。

## 規模

| 種別 | 個数 |
|------|------|
| requirement | 15 |
| param | 4 |
| entity | 8 (Department, User, Room, Plan, Subscription, Invoice, InvoiceLine, Reservation) |
| enum | 2 (CancelReason, InvoiceLineKind) |
| lifecycle | 3 (L_reservation, L_subscription, L_invoice) — 状態 8・遷移 6 |
| actor | 3 |
| capability | 12 |
| scope | 3 |
| grant | 3 ブロック |
| rule | 17 (identity 1 / catalog 2 / billing 5 / reservation 4 / policy 5) |
| derive | 4 |
| feature | 13 (command 9 / query 4) |
| job | 2 |
| event | 14 |
| error | 18 (うち severity: notice 2) |
| world | 2 |
| scenario | 21 |

---

## 実証課題の要求 → 記述箇所

指示にあった要素が「自然言語の但し書き」ではなく DSL 上のどこに表現されているか。

### 一般利用者・部門管理者・システム管理者の 3 ロール

| 要求 | 記述箇所 |
|------|---------|
| ロールの定義と包含関係 | `identity.Member` / `DeptAdmin extends Member` / `SysAdmin extends DeptAdmin` |
| 誰が何をできるか | `grant Member` / `grant DeptAdmin` / `grant SysAdmin`（**ここにしかない**） |
| どの範囲でできるか | `scope S_own` / `S_dept` / `S_all` + `entity` の `owner:` / `scope_by:` |
| 可視範囲の差 | `F_view_reservations` 1 本。3 ロールで返る集合が変わるのは grant の帰結 |
| 検証 | `SC_member_sees_only_own_reservations`, `SC_dept_admin_sees_department_reservations`, `SC_member_cannot_change_plan` |

### プラン変更・日割り計算

| 要求 | 記述箇所 |
|------|---------|
| プラン変更操作 | `billing.F_change_plan` |
| 変更可否 | `R_plan_change_requires_active_subscription`, `R_plan_change_must_differ` |
| 残存比率 | `D_remaining_ratio(at, period)` — 暦日ベース、tz は `P_billing_timezone` |
| 差額 | `D_proration_delta(from_price, to_price, ratio)` — 丸めは `P_money_rounding` で 1 回だけ |
| 上位変更＝追加請求 / 下位変更＝控除 | `F_change_plan.effect` の `kind: if delta > 0 JPY then ProrationCharge else ProrationCredit` |
| 下位変更が既存予約と矛盾する場合 | `R_plan_quota_active_reservations` / `R_plan_advance_limit` の `on_violation` 文脈分岐 |
| 検証 | `SC_plan_upgrade_is_prorated` (13548 JPY), `SC_plan_downgrade_credits` (-13548 JPY), `SC_downgrade_blocked_by_advance_limit` |

### 解約後の予約の扱い

| 要求 | 記述箇所 |
|------|---------|
| 解約操作と役務提供終了時刻 | `billing.F_cancel_subscription`（`service_end = current_period.end`） |
| 契約の状態遷移 | `L_subscription`: Active → Cancelling → Ended |
| 終了時刻を跨ぐ予約の扱い | `policy.R_reservation_within_service_window` — **1 本の制約**。<br>新規作成時は `reject(E_BEYOND_SERVICE_END)`、既存予約は `compensate` で自動取消 |
| 契約側の変更を予約側に波及させる仕組み | 同 rule の `recheck { on write billing.Subscription ... }` |
| 契約終了後は予約できない | `policy.R_reservation_requires_active_subscription` |
| 実際の終了処理 | `billing.J_close_billing_period`（Cancelling → Ended） |
| 検証 | `SC_cancellation_drops_reservations_after_service_end`, `SC_reservation_beyond_service_end_rejected`, `SC_reservation_within_service_end_allowed`, `SC_ended_subscription_blocks_reservation`, `SC_cancelling_subscription_ends_at_period_close` |

### 予約のキャンセル期限と、期限を跨いだ場合の課金

| 要求 | 記述箇所 |
|------|---------|
| 期限 | `common.P_cancel_free_window = PT24H`（テナント設定可） |
| 制約 | `policy.R_cancel_before_deadline`：`ctx.now <= self.period.start - P_cancel_free_window` |
| 期限を跨いだ場合の扱い | 同 rule の `on_violation: compensate(E_LATE_CANCELLATION)` — **操作は成立させたうえで**違約金明細を作る |
| 違約金の額 | `D_late_cancel_fee(hourly_rate, period)` = 時間単価 × 時間数 × `P_late_cancel_rate` |
| 免除 | 同 rule の `override { capability: C_waive_charge, requested_by: input.waive_fee }` |
| 自動取消には課金しない | `on: [feature F_cancel_reservation]` に束縛されるため、`compensate` 経由の取消には効かない |
| 検証 | `SC_cancel_before_deadline_is_free`, `SC_cancel_after_deadline_charges_fee`, `SC_sysadmin_waives_late_fee`, `SC_member_cannot_waive_late_fee` |

### 重複予約の禁止と、管理者による強制上書き

| 要求 | 記述箇所 |
|------|---------|
| 重複禁止 | `reservation.R_no_double_booking`（`let conflicts` + `count(conflicts) == 0`） |
| 違反時 | `reject(E_ROOM_CONFLICT, blames: input.period)` |
| 強制上書きの権限 | `override.capability: identity.C_override_conflict`（`grant SysAdmin` のみ） |
| 上書きの要求方法 | `override.requested_by: input.force_override` → `F_create_reservation.input` に存在（検査 C-22） |
| 上書き時に既存予約をどうするか | `override.effect` が `conflicts` を `Cancelled { cancel_reason: OverriddenByAdmin }` に遷移させ、`Ev_reservation_overridden` を発行 |
| 上書き用の別機能は存在しない | `F_create_reservation` 1 本のみ |
| 検証 | `SC_double_booking_rejected`, `SC_member_cannot_override_conflict`, `SC_sysadmin_override_replaces_existing` |

---

## 受け入れ基準に対する自己評価

### 1. 全要素が DSL 上で表現されている（自然言語への逃げがない）

上の対応表のとおり。`doc:` は仕様上いかなる導出にも使われない（SPEC P6）ため、
`doc:` に書かれた内容は存在しないものとして扱われる。
制約・計算・権限・状態遷移・時間軸のすべてが式または宣言で表現されている。

### 2. 同一の制約が 2 箇所以上に重複していない

- 構文レベル: 述語を書ける位置が `rule.assert` / `rule.when` / `scope.where` / `derive` /
  `effect` の条件 / `scenario.then` に限定されている（C-19）。
  `feature` に前提条件を書く構文が存在しない。
- 検査レベル: 正規化 `assert` AST のハッシュ一致で重複を検出（C-DUP）。
- 設計レベル: 文脈で扱いが変わる制約（解約後の予約）は `on_violation` の文脈分岐で
  1 本に保たれ、上書き可能な制約（重複禁止・キャンセル期限）は `override` で 1 本に保たれている。
- 数値の重複: 24 時間・50%・丸めモード・タイムゾーンはすべて `common.fspec` の `param` に集約。

### 3. 機械可読である

`../grammar.ebnf` に字句・構文の完全な定義がある。改行区切り・中置式・
宣言種別ごとに有限のサブ宣言キーワードという構成により LL(2) で決定的に解析できる。
曖昧になりうる箇所（`[` のリスト／内包表記、`MONEY` リテラル、文脈依存キーワード）は
すべて解消規則を明記した。

### 4. 変更の影響を DSL 上で追跡できる

参照グラフの辺は SPEC §11.1 の 20 種で閉じており、`impact()` の結果は一意。
IR には `blast` 索引として事前計算される。
例: `fspec impact common.P_cancel_free_window` → 1 制約・1 機能・4 具体例に閉じる。
`fspec impact billing.Plan` → `policy` を経由して `reservation.F_create_reservation` まで到達する。

### 5. WORKFLOW に従えば基本設計の入力が機械的に得られる

`../WORKFLOW.md` §3 の 13 種の生成物。すべて IR からの決定的変換であり、
権限マトリクス・状態遷移表・機能一覧・API 候補・同時実行制御の要求などを
この仕様に対して実際に展開して掲載してある。

### 6. 決定論的に処理でき、ランタイムから参照できる

- 浮動小数点なし、除算は厳密有理数、丸めは明示（C-06）。
- 時刻・タイムゾーン・ロール・権限はすべて `ctx` から注入され、式は `ctx` の関数になる。
- rule の評価順は IR の `rules_by_feature` に固定して載る（フェーズ順・宣言順）。
- 是正処置後の再評価をしないため停止性が保証される。
- ランタイム API は SPEC §13。`ir/excerpt.ir.json` が実際の表現例。

---

## 手で追える計算例

`SC_plan_upgrade_is_prorated` の 13548 JPY:

```
period  = [2026-05-01T00:00+09:00, 2026-06-01T00:00+09:00)
tz      = Asia/Tokyo
total   = days_between(2026-05-01, 2026-06-01) = 31
at      = 2026-05-11T10:00+09:00 → date 2026-05-11
used    = days_between(2026-05-01, 2026-05-11) = 10
ratio   = rational(31 - 10, 31) = 21/31

delta   = round_money((30000 JPY - 10000 JPY) * 21/31, HALF_UP)
        = round_money(420000/31 JPY, HALF_UP)
        = round_money(13548.3870… JPY, HALF_UP)
        = 13548 JPY          // JPY は最小単位 0 桁
```

`SC_cancel_after_deadline_charges_fee` の 3000 JPY:

```
period      = [2026-05-01T14:00+09:00, 2026-05-01T16:00+09:00)
duration    = PT2H → seconds = 7200
hours       = rational(7200, 3600) = 2
fee         = round_money(3000 JPY * 2 * 0.5000, HALF_UP) = 3000 JPY

deadline    = 2026-05-01T14:00+09:00 - PT24H = 2026-04-30T14:00+09:00
ctx.now     = 2026-05-01T10:00+09:00 > deadline  → 違反 → compensate
```

中間値が厳密有理数で保持され、丸めが最後に 1 回だけ入ることが、
この 2 つの値が実装によらず一意に定まる理由である。
