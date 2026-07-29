---
title: コーヒー豆の記録
slug: coffee-beans
kind: logtopic
created: 2026-07-29
tags: [log/coffee]
image_visibility: public
fields:
  - { key: roaster, label: 焙煎所/ブランド, type: text, required: true }
  - { key: origin, label: 産地, type: text }
  - { key: process, label: 精製, type: enum, options: [washed, natural, honey, anaerobic, その他] }
  - { key: roast, label: 焙煎度, type: enum, options: [light, medium, medium-dark, dark] }
  - { key: rating, label: 評価, type: rating, required: true }
  - { key: price, label: 価格, type: number, unit: 円 }
  - { key: flavor, label: フレーバー, type: tags }
  - { key: rebuy, label: また買う, type: bool }
  - { key: tasted_on, label: 飲んだ日, type: date }
display:
  subtitle: roaster
  badge: rating
  card_fields: [origin, roast, flavor]
  sort: { by: tasted_on, order: desc }
  filters: [process, roast, rating]
---

コーヒー豆を買うたびに記録する。産地・精製・焙煎度と、実際に淹れて飲んだ評価・所感を残して、次に買う豆選びの参考にする。

## 記録のコツ

- 豆の袋を1枚撮る（産地・精製・焙煎度がラベル代わりになる）
- 淹れ方はできるだけ固定して評価する（比較の前提を揃えるため）
- 「また買う」を必ず付ける。あとで見返すとき一番効く
