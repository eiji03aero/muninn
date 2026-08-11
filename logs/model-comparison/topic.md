---
title: AIモデル比較の記録
slug: model-comparison
kind: logtopic
created: 2026-08-09
tags: [log/model-eval]
image_visibility: none
fields:
  - { key: task, label: お題, type: text, required: true }
  - { key: models, label: 対象モデル, type: tags, required: true }
  - { key: effort, label: effort, type: tags, required: true }
  - { key: runs, label: 試行回数, type: number, required: true }
  - { key: winner, label: 基準ベースの勝者, type: text, required: true }
  - { key: rating, label: 差の大きさ, type: rating, required: true }
  - { key: cheaper, label: 安かった方, type: text }
  - { key: cost_delta_pct, label: コスト差, type: number, unit: '%' }
  - { key: blind, label: ブラインド判定, type: bool, required: true }
  - { key: tested_on, label: 実施日, type: date, required: true }
display:
  subtitle: task
  badge: rating
  card_fields: [models, winner, effort]
  sort: { by: tested_on, order: desc }
  filters: [rating, blind]
---

同じお題を複数のAIモデルに投げて、成果物を突き合わせた記録。単発の「どっちが賢いか」ではなく、**お題の性質ごとにどちらが向くか**を貯めるのが狙い。回数を重ねるほど「この種の仕事はこっち」という判断材料になる。

## 記録のコツ

- **effort をどう扱ったかを必ず残す。** 1つに揃えて回したなら `effort` に1つだけ書く（モデル差を見る実験）。
  複数の effort を振ったなら全部書く（モデル差と effort 差を切り分けるマトリクス実験）。
  **揃えたつもりで揃っていないのが最悪**なので、対話の `/effort` ではなく起動時フラグで指定する（→ [[claude-code-effort-flag-batch-eval]]）。
- **測る軸は「外部の正解と照合できるもの」を選ぶ。** 自前で正誤を判定する軸（実装が動くか等）は
  どのモデルも通過して天井に張り付き、差が出ない（→ [[llm-eval-verifiable-axes-discriminate]]）。
- **試行回数を正直に書く。** n=1 は傾向であって結論ではない。あとで見返すときに一番効く欄。
- **ブラインド判定したかを必ず残す。** どちらの出力か知って採点した結果は、知らずに採点した結果と別物として扱う。
- **評価基準（rubric）は本文に全文置く。** 勝敗そのものより「何を測ったか」のほうが後から効く。基準に入れ忘れた軸は必ず出るので、それも書く。
- コストは実測値（`/cost`）を使う。単価の掛け算で推定しない。
