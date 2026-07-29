---
title: <トピック名（例: コーヒー豆の記録）>
slug: <topic-slug>          # kebab-case。logs/<slug>/ のディレクトリ名と一致させる
kind: logtopic              # ログのトピック＝スキーマ定義（ハブ）。クイズ対象外・srsは付けない
created: YYYY-MM-DD
tags: [log/<sub>]           # 既存タグを走査してから付ける（新タグ乱造禁止）
image_visibility: public    # public=圧縮画像をファイルで公開 / none=画像を使わない（将来: encrypted）
fields:                     # 記録項目のスキーマ。ここで決めた項目で全 entry を一貫させる
  # type: text | longtext | number | rating | enum | tags | date | bool | url
  #   text     … 短いテキスト（産地・店名など）
  #   longtext … 長文（本文に書くなら不要。短評はbody推奨）
  #   number   … 数値。unit を付けられる（例: 円 / g / cm）
  #   rating   … 1〜5の評価（★表示。max を変えたければ書く。既定5）
  #   enum     … options から1つ選ぶ（選択肢を固定＝一貫性が出る）
  #   tags     … 複数タグ（フレーバー・特徴など。自由）
  #   date     … YYYY-MM-DD
  #   bool     … はい/いいえ
  #   url      … 参考リンク
  - { key: <field-key>, label: <表示名>, type: text, required: true }
  - { key: <field-key>, label: <表示名>, type: enum, options: [<a>, <b>, <c>] }
  - { key: rating,      label: 評価,     type: rating, required: true }
display:                    # サイト（GitHub Pages）での見せ方
  subtitle: <field-key>     # カードのサブ見出しに使う field（任意）
  badge: rating             # カードのバッジに使う field（rating推奨。任意）
  card_fields: [<key>, <key>]   # カードに chip で出す field（2〜3個に絞る）
  sort: { by: <field-key>, order: desc }   # 既定の並び順（desc=新しい/大きい順）
  filters: [<enum-key>, rating]            # 絞り込みUIを出す field（enum / rating 向き）
---

<このトピックで何を記録するか、1〜2段落。記録のコツ（同条件で評価する等）を書くと一貫性が出る。>

## 記録のコツ

- <例: 豆の袋を1枚撮る（産地・精製がラベル代わりになる）>
- <例: 淹れ方は固定して評価する（比較のため）>
