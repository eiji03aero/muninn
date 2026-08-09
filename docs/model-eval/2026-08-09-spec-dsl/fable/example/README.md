# 実証課題: サブスクリプション課金つき会議室予約システム

fspec による仕様セット。ファイルはファイル名の辞書順に読み込まれる(順序は
導出物の並びにのみ影響し、意味には影響しない)。

| ファイル | module | 内容 |
|---|---|---|
| `00-base.fspec` | base | 通貨・設定値(キャンセル期限)・アクター |
| `01-domain.fspec` | domain | エンティティ・enum・lifecycle(状態遷移+タイマー) |
| `02-constraints.fspec` | constraints | 共有述語・金額計算(calc)・不変条件(rule) |
| `03-billing.fspec` | billing | 契約・プラン変更・解約・課金照会の behavior |
| `04-reservation.fspec` | reservation | 予約の作成・取消・強制上書き・照会の behavior |

## 課題要素 → 記述箇所の対応

| 課題要素 | 記述箇所(単一定義点) |
|---|---|
| 3 ロール | `actors`(00)+ 各 behavior の `allow`(スコープ条件つき) |
| プラン変更 | `behavior change_plan`(03)。上位=即時、下位=次回更新時(`pending_plan` + `renew` 遷移) |
| 日割り計算 | `calc proration_charge`(02)。有理数演算 + `round(#half_up)` で決定論的 |
| 解約後の予約の扱い | `rule reservation_within_subscription`(02)+ `Subscription.cancel` 遷移の effect(01)+ `terminate` タイマー遷移 |
| 予約のキャンセル期限 | `param cancellation_notice`(00)+ `derive Reservation.cancel_deadline`(01) |
| 期限を跨いだ課金 | `calc cancellation_charge`(02)+ `behavior cancel_reservation` の effect(04) |
| 重複予約の禁止 | `rule no_double_booking` + `calc conflicting_reservations`(02) |
| 管理者による強制上書き | `behavior force_reserve`(04)の `overrides` + `audit`、rule 側の `overridable by`(02)、`force_release` 遷移(01) |

## DRY の確認ポイント

- 重複判定(overlap)は `conflicting_reservations` の 1 箇所。禁止 rule と
  強制上書きの解放対象の両方がこれを参照する。
- キャンセル期限は `cancel_deadline` の 1 箇所。課金判定 `cancellation_charge` が参照する。
- 「有効な契約」は `active_subscriptions` の 1 箇所。予約可否 rule・契約系 behavior・
  課金先の解決すべてがこれを参照する。
- 時間帯妥当性・重複禁止・契約有効性の各制約は rule に 1 度だけ書かれ、
  `create_reservation` / `force_reserve` には現れない(書き込み集合から自動適用)。
