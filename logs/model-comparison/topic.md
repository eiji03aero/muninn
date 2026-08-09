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
  - { key: effort, label: effort, type: enum, options: [low, medium, high, xhigh, max], required: true }
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
  filters: [effort, rating, blind]
---

同じお題を複数のAIモデルに投げて、成果物を突き合わせた記録。単発の「どっちが賢いか」ではなく、**お題の性質ごとにどちらが向くか**を貯めるのが狙い。回数を重ねるほど「この種の仕事はこっち」という判断材料になる。

## 記録のコツ

- **effort を必ず揃えて記録する。** 揃えずに回すとモデル差ではなく effort 差を見ることになる。
- **試行回数を正直に書く。** n=1 は傾向であって結論ではない。あとで見返すときに一番効く欄。
- **ブラインド判定したかを必ず残す。** どちらの出力か知って採点した結果は、知らずに採点した結果と別物として扱う。
- **評価基準（rubric）は本文に全文置く。** 勝敗そのものより「何を測ったか」のほうが後から効く。基準に入れ忘れた軸は必ず出るので、それも書く。
- コストは実測値（`/cost`）を使う。単価の掛け算で推定しない。
