---
follow: <フォロー名（例: argentina-nt）>
kind: collect               # フォローの収集スペック（設定）。クイズ対象外・srsなし。サイトには出さない
cadence: weekly             # 収集頻度の目安（自動化する場合）。weekly / monthly / manual など
updated: YYYY-MM-DD
watchlist:                  # 現主力（直近の活躍＋動画を収集する対象）。entities/ のファイル名(slug)
  - <entity-slug>
deep_dive:                  # 成長を重点的に追う（watchlistより深く）。entities/ の slug
  - <entity-slug>
collect:                    # 何を収集するか（オン/オフ）
  recent_form: true         # クラブでの直近パフォーマンス → entity の changelog を更新
  videos: true              # YouTube等の動画 → entity の clips を更新
  next_matches: true        # 代表の次戦日程 → profile の next_matches を更新
  rivals: false             # ライバル情報の更新 → profile の rivals
sources:                    # 任意。収集の当て先や方針
  schedule: "<代表日程の固定URL 任意>"
  notes: "英語一次ソース優先。未確定情報は書かない"
---

## 収集メモ / 調整履歴

収集の方針を人間が書き足す欄。`mn-collect` はここも読む。
「〜を深掘りに追加」「日程はもう追わなくていい」等の調整は、frontmatter とこの欄の両方に反映する。

- YYYY-MM-DD: <調整内容・理由>
