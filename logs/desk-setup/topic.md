---
title: デスク周りの記録
slug: desk-setup
kind: logtopic
created: 2026-10-04
tags: [log/workspace, ergonomics/workspace]
image_visibility: public
fields:
  - { key: category, label: 種別, type: enum, required: true, options: [PC, ディスプレイ, キーボード, ポインティング, デスク, チェア, 照明, 音響, カメラ, 周辺機器] }
  - { key: maker, label: メーカー, type: text }
  - { key: model, label: モデル, type: text, required: true }
  - { key: specs, label: 主な仕様, type: text }
  - { key: position, label: 配置, type: text }
  - { key: connection, label: 接続, type: text }
  - { key: since, label: 使用開始, type: date }
  - { key: in_use, label: 現役, type: bool }
  - { key: rating, label: 満足度, type: rating }
  - { key: pain, label: 不満点, type: text }
display:
  subtitle: model
  badge: rating
  card_fields: [position, specs]
  sort: { by: category, order: asc }
  filters: [category, in_use]
---

在宅のPC仕事で使っているデスク周りの道具を**1個1件**で記録する。目的は **「なんか変えたい」と思ったときに、現状の構成を前提にすぐ相談できること**。
買い替えた旧機材は消さずに `in_use: false` にして残す（何から何に変えたか、なぜ変えたかが辿れるように）。

## 現在の配置（2026-10-04 時点・口頭ベース）

```
 ┌──────────────┐
 │ BenQ E2220HD │
 │   21.5"      │            ┌────────────┐
 ├──────────────┤            │ MacBook Pro│ ← スタンドで少し持ち上げ
 │ JAPANNEXT    │            │    14"     │
 │   14.1"      │            └────────────┘
 └──────────────┘
      [ ErgoDox EZ（左右分割） ]  [Magic Trackpad]
 ════════════ オカムラ 電動昇降デスク ════════════
```

- 左に**縦2段**（上：BenQ 21.5"／下：JAPANNEXT 14.1"）、右に**スタンドで持ち上げた MacBook Pro**。3画面。
- 入力は **ErgoDox EZ**、その右に **Magic Trackpad**。どちらも**机の上**。
- **未記録**：チェア・照明・モニタアーム/スタンドの種類・MacBook とディスプレイの繋ぎ方・カメラ/マイク/スピーカー。分かり次第1件ずつ足す。

## 構成を並べて最初に気になること（仮説・要実測）

1. **上段の BenQ は視線より上に来ている可能性が高い**。快適な視線帯は水平から15〜30°下で、見上げる方向が疲れる（→ [[comfortable-gaze-zone-is-15-to-30-degrees-below-horizontal]]）。縦積みの上段は構造的に高くなりやすい。
2. **その BenQ は TN パネル**。TN は上下方向の視野角による色・明るさの変化が大きいので、見上げる角度で使うと**画面の上下で見え方が変わる**のを体感しやすい。
3. **どれが「主」画面か**。主を正中線に置くのが原則。いま一番長く見ているのが右の MBP なら、首を右に回したまま固定している時間が長いことになる（→ [[sustained-low-level-load-hurts-more-than-brief-heavy-load]]）。

4. **キーボードが机上なので、机の高さは肘で決まる**。画面の高さは机では合わせられず、スタンドやアームで個別に合わせることになる。左の縦2段の上段が高すぎないかは、この前提で見る。

→ 実測したいのは「着座時の目の高さ」「各画面の中心の高さ」「一番長く見ている画面はどれか」の3つ。

## 記録のコツ

- **型番は本体ラベルで確定させる**（JAPANNEXT・オカムラのデスク・MBP の年式/チップは現時点で未確定）。型番が分かれば仕様と買い替え候補の比較が一気に具体的になる
- **不満点（pain）を必ず書く**。相談の燃料はここ。満足度だけだと何を変えればいいかが出てこない
- 写真を足すときは**部屋の中や個人情報が写り込まない**ものだけにする（画像は Pages 上で直URLで見える）
