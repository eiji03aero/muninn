---
title: Home — 全MOCの入口
created: 2026-06-07
tags: [moc]
---

muninn の入口。テーマごとのMOCはここから辿る。

## MOC一覧

- [[health]] — 健康・栄養（髪と栄養素、入浴とストレスなど）
- [[golf]] — ゴルフのスイング・体の使い方
- [[football]] — サッカー（アルゼンチン代表の戦術・選手・蘊蓄）
- [[middle-east]] — 中東情勢（イスラエル・米国 対 イラン、レバノン情勢）
- [[science]] — 科学・宇宙論（宇宙の形成と構成）
- [[coffee]] — コーヒー（精製と気候、焙煎後の劣化、香りと温度）
- [[dev-frontend]] — フロントエンド（宣言的UI、状態の置き場所、The Elm Architecture）

## 学習アトラス（atlas/）

トピックを知識グラフ＋読む順路（ルート）で体系的に学ぶ読み物レイヤー。`/mn-learn` で運用（notes/ とは別concern）。サイトでは「マップ／ルート」で読み進める。

- [[philosophy|哲学（知識アトラス）]] — 神話から理性へ、古代ギリシアから認識論まで。概念グラフを順路でたどる（`atlas/philosophy/`）
- [[mathematics|数学（知識アトラス）]] — 数学の全体地図。6分野を「日常／裏側／レンズ」の距離つきで一周し、地図の外側まで見る（`atlas/mathematics/`）
- [[ui-architecture|UIアーキテクチャ（知識アトラス）]] — 「状態を画面へ写す問題」に対する Reactのモデル と The Elm Architecture の二つの答えを読み、指標ごとに比較する（`atlas/ui-architecture/`）
- [[ergonomics|人間工学（知識アトラス）]] — 実用ファーストの地図。デスクワーク環境（椅子・モニタ・机・光）とUI設計（認知）の2ルート。理論ノードは深掘り待ちの stub で下にぶら下げてある（`atlas/ergonomics/`）

## 未分類

- [[zettelkasten-one-note-one-idea]] — このナレッジベースの基本原則
- [[cliche-overused-not-necessarily-old]] — クリシェの意味（使い古されて陳腐が核）
- [[claude-fable-5-costs-double-opus-5-per-token]] — Fable 5 と Opus 5 の単価差（総額は別）
- [[llm-comparison-forgotten-criteria-flip-the-verdict]] — モデル比較の設計上の落とし穴
- [[llm-eval-verifiable-axes-discriminate]] — 差が出るのは照合できる軸だけ。自前の正誤判定は天井に張り付く
- [[llm-effort-differs-by-model-tier]] — effort が増やすものはモデルで違う（探索のスイッチ／深さの調整）
- [[most-striking-n1-observation-is-likely-noise]] — n=1 で一番目を引いた観測ほど再現しない（追試で結論を1本取り下げた）
- [[claude-code-effort-flag-batch-eval]] — `--model` / `--effort` でモデル×effort を非対話に回す

## フォロー（follows/）

スキル・対象を定点観測する時系列ジャーナル。`/mn-follow` で運用（notes/ とは別concern）。現状は `node scripts/mn-status.mjs` で一覧できる。

- [[golf-driver-distance/profile|ゴルフ ドライバー飛距離]] `[goal]` — スイングを定点観測して飛距離アップを追う（`follows/golf-driver-distance/`）
- [[argentina-nt/profile|アルゼンチン代表]] `[interest]` — 代表チームを追って試合を最大限楽しむ（`follows/argentina-nt/`）
- [[skincare-pores/profile|スキンケア（毛穴を目立たなくする）]] `[goal]` — 毛穴ケアを定点観測して「たるみ毛穴」を目立たなくする（`follows/skincare-pores/`）

## 創作（writings/）

お題に対して自分で書き、固定の5軸（引き/構成/具体/文体/声）で講評を受け、改稿を重ねて作品にする。`/mn-write` で運用（muninn で唯一のアウトプットconcern）。

> **サイト未対応**（`docs/pbi/PBI-04-writings-face.md`）。現状はリポジトリの markdown で読む。下のリンクはサイトではただの文字列になる。

- [[rubric|文章の評価軸（ルーブリック）]] — 講評の軸の正本。ここが動くと上達が測れなくなる（`writings/rubric.md`）
- [[prompts|お題ストック]] — 鍛えたい軸ごとに設計したお題の在庫（`writings/prompts.md`）

### 作品

- [[oyachumi-no-jikan|おやちゅみの時間（仮）]] `[推敲中]` — 小説の導入の一節。日常から度肝を抜く展開へ繋ぐ（`writings/pieces/`）

## ログ（logs/）

トピック別に、多数の項目を一貫したスキーマ（記録項目）で貯める記録帖（台帳）。`/mn-log` で運用（notes/ とは別concern）。サイトでは一覧・絞り込みで比較できる。

- [[coffee-beans|コーヒー豆の記録]] — 買った豆を産地・精製・焙煎度・評価で記録して次の豆選びに使う（`logs/coffee-beans/`）
- [[model-comparison|AIモデル比較の記録]] — 同じお題を複数モデルに投げて成果物を突き合わせ、お題の性質ごとの向き不向きを貯める（`logs/model-comparison/`）
