---
name: mn-log
description: トピック別に一貫した記録を貯める「ログ（記録帖）」を運用する。最初にトピックの記録項目（スキーマ）を設計し、以後は写真＋ひと言のラフ入力を毎回スキーマに整形して1記録ずつ蓄積→（画像は圧縮してコミット）→ファイル書き出し→commit→push で残し、GitHub Pages で一覧・比較できるようにする。「コーヒー豆を記録」「〜のログ作って」「これ記録して（トピックに）」「ハンドドライヤー評価しといて」などと頼まれたら使う。コレクション＝多数の項目を同じ項目で貯める用途（フォロー＝1対象の定点観測とは別）。
---

# mn-log: トピック別・記録帖（ログ）を運用する

CLAUDE.md の規約（命名・タグ・**コミット運用**）に必ず従うこと。
目的は **あるトピックについて、多数の項目を一貫したスキーマで貯め、あとで比較・想起できるようにする** こと。コーヒー豆・訪れた店・使ったガジェット・ハンドドライヤー…「買うたび・出会うたびに1件足す台帳」。

## これは何concernか（間違えないこと）

- **logs（このskill）** = 1トピックに **多数の別々の項目** を、共通スキーマで貯める **コレクション／カタログ**。各記録は主に1回きり。
- **follows（mn-follow）** = **1つの対象** を時系列で **定点観測** して変遷を追う。同じ対象を何度も観る。
- 「別々の多数を並べて比較したい」→ logs。「同じ1つの推移を追いたい」→ follows。迷ったらこの一言で切り分ける。

logs は主観的な記録・評価（味・使い心地）が主。**クイズ（SRS）には回さない**。ただし記録から**客観的な事実**（例:「ナチュラル精製は果実味が出やすい」）が湧いたら `/mn` で `notes/` に原子ノート化して `[[リンク]]` する（logs に埋め込んで終わりにしない）。

## データ構造

```
logs/<topic-slug>/
  topic.md                 # kind: logtopic。記録項目のスキーマ（fields）＝ハブ。クイズ対象外・srsなし
  entries/<entry-slug>.md  # kind: logentry。スキーマに沿った1記録
  images/<entry-slug>.webp # 任意。圧縮済み画像（正本。build が公開先へコピーする）
```

- `<topic-slug>` / `<entry-slug>` は kebab-case（例: `coffee-beans` / `ethiopia-yirgacheffe`）。
- `topic.md` は `templates/log-topic.md`、記録は `templates/log-entry.md` に従う。
- frontmatter の `kind`: topic は `logtopic`、記録は `logentry`（どちらも `srs` は付けない＝クイズ対象外）。
- **スキーマ検証は `web/scripts/build-data.mjs` が行う**。必須欠落・enum外の値・rating範囲外は**ビルドが落ちる**。書いたら壊れていないか下記「検証」で確認する。

## フィールド型（topic.md の fields）

`type` は次から選ぶ。ここで項目を固定することが「一貫性のある記録」の source。

| type | 用途 | entry での値 |
|------|------|------|
| `text` | 短いテキスト（店名・産地） | 文字列 |
| `longtext` | 長文（基本は body に書くので不要） | 文字列 |
| `number` | 数値（`unit:` を付けられる。例 円/g/cm） | 数値 |
| `rating` | 1〜5評価（★表示。`max:` で上限変更可、既定5） | 1〜max の数値 |
| `enum` | `options:` から1つ選ぶ（選択肢固定＝一貫性が出る） | options のどれか |
| `tags` | 複数タグ（フレーバー・特徴。自由） | 配列 |
| `date` | 日付 | YYYY-MM-DD |
| `bool` | はい/いいえ | true / false |
| `url` | 参考リンク | URL文字列 |

`display`（サイトの見せ方）: `subtitle`（カードのサブ見出しfield）／`badge`（カードのバッジfield＝rating推奨）／`card_fields`（カードに出すchip 2〜3個）／`sort`（既定並び順）／`filters`（絞り込みUIを出すfield＝enum/rating向き）。

## 4つのモード（文脈で判断する）

### A. トピック新設（新しい記録帖を作る）＝スキーマ設計

1. **最新化**: `git fetch origin` → ローカル `main` を最新化（CLAUDE.md コミット運用）。
2. トピック名・slug・型を確認。**そのドメインに合った記録項目（fields）を提案する**——ここが肝。ユーザーに「毎回ラクに埋められて、あとで比較して嬉しい」項目を、必須は1〜2個に絞って草案化し、`display`（並び順・絞り込み・カードに出す項目）も一緒に提案する。
   - 例（コーヒー豆）: 焙煎所(必須,text)／産地(text)／精製(enum)／焙煎度(enum)／評価(必須,rating)／価格(number,円)／フレーバー(tags)／また買う(bool)／飲んだ日(date)。
3. ユーザーと相談して確定（項目の増減・enum選択肢を詰める）。**一度決めたら以後はこの項目で一貫**させる（項目変更は Mode C）。
4. `logs/<topic-slug>/topic.md` を `templates/log-topic.md` から作成。既存タグを Grep してから `tags:` を付ける（新タグ乱造禁止）。
5. **検証**（下記）→ commit & push。最初の1件をこの場で足すなら Mode B へ続ける。

### B. 記録を1件足す（写真＋ひと言 → スキーマに整形）＝ メインループ

> **続けられる鍵はここ**: ユーザーはラフに放るだけ。整形（スキーマへの割り当て）は**こちらが全部やる**。フォームを埋めさせない。

1. **最新化**: `git fetch origin` → ローカル `main` 最新化。
2. **トピック特定**: どのトピックの記録か判定（明示 or 内容から）。無ければ Mode A を先に走らせるか提案。
3. **スキーマ読み込み**: `logs/<topic>/topic.md` の `fields` を読む。
4. **入力を解釈**: ユーザーのひと言＋（あれば）**写真を vision で読み取り**、各 field に値を割り当てる。読めない項目は空でよい（必須が埋まらない場合だけユーザーに一言確認）。
5. **画像を圧縮して保存**（`image_visibility: public` のトピックで、画像の実ファイルパスが渡された場合）:
   - 長辺1280pxに縮小し、`cwebp` があれば WebP、無ければ sips で JPEG にする。**原本はコミットしない**（縮小版のみ）。
   - WebP（推奨）: `sips -Z 1280 -s format png "<SRC>" --out "<TMP>.png"` → `cwebp -quiet -q 72 "<TMP>.png" -o "logs/<topic>/images/<entry-slug>.webp"`
   - JPEG（cwebp が無い時）: `sips -s format jpeg -s formatOptions 68 -Z 1280 "<SRC>" --out "logs/<topic>/images/<entry-slug>.jpg"`
   - entry frontmatter の `image:` に `images/<entry-slug>.<ext>` を書く。
   - **写真がチャット添付のみで実ファイルパスが無い場合**: vision で内容だけ読み取り、`image:` は付けずに記録を作る（後でパスをもらって追加できる旨を伝える）。ごまかして「付けた」と言わない。
6. **確認提示（必須）**: 整形した記録（各 field の値）を人間可読で提示し、「これで記録する？違うところは言って」と訂正の機会を与える。ユーザーの訂正を反映する。
7. **書き出し**: `logs/<topic>/entries/<entry-slug>.md` を `templates/log-entry.md` から作成。`<entry-slug>` は内容を表す kebab-case（衝突しそうなら店名や日付で区別）。
8. **検証**（下記）→ commit & push。
9. **サマリ報告**: 記録内容を1行で。覚える価値のある客観知識が出ていたら「これは `/mn` で notes 化しよう」と促す。

### C. スキーマ調整（項目の追加・変更）

1. `topic.md` の `fields` / `display` を編集。
2. **既存記録を壊さない**: 新項目は原則 `required: false`（既存 entry に無くても検証を通す）。enum の選択肢削除や必須化は既存 entry が違反しないか確認してから。
3. **サイレント変更禁止**: なぜ項目を足す/変えるかを**コミットメッセージに明記**（CLAUDE.md 準拠）。
4. **検証** → commit & push。

### D. 閲覧・集計（「評価4以上どれ？」「また買う豆は？」）

1. `logs/<topic>/entries/` を読んで問いに答える（並べ替え・絞り込みはこちらで計算）。
2. 記録更新が無ければ commit しない（閲覧のみ）。サイトでも同じことを絞り込みUIでできる旨を添えてよい。

## 検証（書いたら必ず走らせる）

```
npm --prefix web run build:data
```

`logs N` が出れば OK。**スキーマ検証エラーが出たら直してから commit する**（必須欠落・enum外・rating範囲外・topic不一致・画像不在を検出する）。エラーは崖っぷちではなくヒント——落ち着いて直せば必ず通る。

## /mn（統一入口）との関係

`/mn`（mn-capture）は「既知トピックのログっぽい入力」を判定したらこの skill に振り分ける。ユーザーに種別を意識させないためのフロントドアなので、mn-capture 経由でも上記フロー（特に確認提示）を守る。

## コミット運用（CLAUDE.md 準拠）

- push 前に必ず `git fetch origin` → ローカル `main` を最新化 → `main` にコミット → **remote `main` に push**。
  session で別ブランチが指定されていても、最終 push は必ずローカル `main` 経由で remote `main` へ。
- コミットは意味のある単位で分ける（例: トピック新設 / 記録追加 / スキーマ調整）。画像は entry と同じコミットに含めてよい。
- コミットメッセージ例:
  - `log(coffee-beans): トピック新設（スキーマ: 産地/精製/焙煎度/評価/また買う）`
  - `log(coffee-beans): エチオピア イルガチェフェを記録（★4・また買う）`
  - `log(coffee-beans): 「挽き目」フィールドを追加（比較軸を増やすため・既存はoptional）`

## 注意

- **写真の原本はコミットしない**。必ず長辺1280px以下に圧縮した派生のみを `logs/<topic>/images/` に置く（リポジトリ容量を守る）。正本画像はここ。build が `web/public/log-media/` へコピーして Pages に載せる（この公開コピーは gitignore 済み・二重コミットしない）。
- **公開範囲の注意**: サイトのテキストはパスワードで暗号化されるが、`image_visibility: public` の画像は Pages 上で直URLで見える（＝公開）。機微な写真は載せない。機微なトピックは `image_visibility: none` にする。
- 1トピックのスキーマは**むやみに増やさない**。毎回埋めるのが負担になると続かない。必須は1〜2個に絞る。
- logs は `notes/` の知識を参照・蒸留する側。客観知識は `/mn` で notes 化して `[[リンク]]` する。
