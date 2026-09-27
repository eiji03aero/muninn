---
title: クラブセットの記録
slug: golf-clubs
kind: logtopic
created: 2026-09-27
tags: [log/golf, sports/golf]
image_visibility: public
fields:
  - { key: category, label: 種別, type: enum, required: true, options: [ドライバー, フェアウェイウッド, ユーティリティ, アイアン, ウェッジ, パター] }
  - { key: club, label: 番手, type: text, required: true }
  - { key: maker, label: メーカー, type: text }
  - { key: model, label: モデル, type: text }
  - { key: loft, label: ロフト, type: number, unit: ° }
  - { key: length, label: 長さ, type: number, unit: inch }
  - { key: shaft, label: シャフト, type: text }
  - { key: flex, label: フレックス, type: enum, options: [R, SR, S, X, 不明] }
  - { key: distance, label: 総飛距離, type: number, unit: y }
  - { key: measured, label: 距離は実測, type: bool }
  - { key: in_bag, label: 現役, type: bool }
  - { key: recorded_on, label: 記録日, type: date }
display:
  subtitle: model
  badge: distance
  card_fields: [club, loft, shaft]
  sort: { by: distance, order: desc }
  filters: [category, in_bag, measured]
---

いま使っているクラブを1本1件で記録する。目的は **番手間の距離が階段になっているかを一覧で確認できること**。
飛距離はすべて**総飛距離**（キャリーではない）。

## このセットを並べて最初に分かったこと

記録した時点で **バッグは9本**（1W / 3U / 3I / 5I / 7I / 9I / PW / SW / PT）。14本の枠に**5本の空き**がある。

そして**アイアンは奇数番手だけのハーフセット**で、しかもヴィンテージのマッスルバック。ここから2つの帰結が出る。

1. **番手間が広い**。奇数番手だけ＝隣り合う2本が実質2番手ぶん離れているので、階段が1段あたり**約20y**になる（通常は10〜15y刻み）。
2. **番手の数字が現代のクラブと揃っていない**。ヴィンテージのマッスルバックはロフトが立っておらず、**5番が現代のディスタンス系の7番あたりに相当する**。「5番で140y」は数字としては短く見えるが、ロフトで見ると妥当な範囲に収まる。→ [[golf-iron-number-does-not-mean-loft-two-club-gap-between-eras]]

つまりこのセットの穴は「番手が被っている」ではなく **「間が空いている」** 側。3Uは被るどころか、ドライバーと3番アイアンの間の広い帯をひとりで担当している。

## 記録のコツ

- **ロフトはクラブの刻印かスペック表で確認して入れる**。番手の数字だけでは距離が推定できない（上記）。ヴィンテージ2本（Golden Ram / Shimada）は刻印が無ければ計測を頼む
- 飛距離は `measured` で**実測かどうかを必ず区別する**。推定値を実測のふりをさせると階段の判断を誤る
- 買い替え・調整をしたら、その本の記録を更新して理由を書く（ドライバーのロフト調整のように、設定は変わる）
