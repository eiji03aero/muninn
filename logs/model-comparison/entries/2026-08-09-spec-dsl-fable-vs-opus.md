---
title: 仕様記述DSLの設計 — Fable 5 vs Opus 5
kind: logentry
topic: model-comparison
created: 2026-08-09
fields:
  task: ソフトウェア仕様を管理する独自DSLの設計（実証課題つき）
  models: [claude-fable-5, claude-opus-5]
  effort: high
  runs: 1
  winner: claude-opus-5
  rating: 3
  cheaper: claude-fable-5
  cost_delta_pct: 24
  blind: false
  tested_on: 2026-08-09
---

同一の `task.md` を Claude Code の `--model fable` / `--model opus`（ともに `--effort high`）に投げ、独立した空ディレクトリで完走させた。仕様記述用のDSLを設計させ、「サブスク課金つき会議室予約システム」を実際にそのDSLで書き下ろすところまでを要求した。

## 実測値

| | Fable 5 | Opus 5 |
|---|---|---|
| コスト | **$8.58** | $10.61 |
| API時間 | **21m 22s** | 42m 1s |
| 出力トークン | **88.9k** | 184.6k |
| cache read | 1.5m | 7.5m |
| 総行数 | **1,564** | 5,548 |
| 成果物 | 指定の4点ちょうど | 4点＋EBNF/IRスキーマ/IR実体 |

**トークン単価は Fable が Opus の2倍**（$10/$50 vs $5/$25 per MTok）**にもかかわらず、総額は Fable のほうが約24%安い。** 出力量が半分以下だったため。時間も半分。

## 評価基準と採点

事前に決めた受け入れ基準6項目で採点した。

| # | 基準 | Fable | Opus |
|---|---|---|---|
| 1 | 実証課題の全要素をDSLで表現（自然言語への逃げなし） | ○ | ◎ |
| 2 | 同一の制約が2箇所以上に重複しない | △ | ◎ |
| 3 | 曖昧さのない文法定義がある | ○ | ◎ |
| 4 | 変更時の影響を追跡できる | △ | ◎ |
| 5 | 基本設計の入力が機械的に得られる | ○ | ◎ |
| 6 | 決定論的に処理でき、ランタイム表現を持つ | ○ | ◎ |

**基準ベースでは Opus 5 の勝ち。** 差が出た2箇所が決定的だった。

**基準2（DRY）** — Fable は「重複予約禁止の強制上書き」を rule 側の `overridable by system_admin` と別 behavior `force_reserve` に分けた結果、`create Reservation {...}` が通常の予約作成と `force_reserve` の2箇所に再出現した。DRY を要件に掲げたタスクで、自身の実例が DRY を破っている。Opus は `override {}` ブロックを rule の内側に閉じ、feature 側は `force_override: Bool` の入力1つで済ませた。

**基準4（影響追跡）** — Fable の `trace "REQ-RSV-01"` はただの文字列で、タイプミスをコンパイラが検出できない。Opus は要件アンカー用のファイルを置いて `traces: [ req.REQ_08 ]` と解決可能な参照にしたため、壊れた追跡リンクが静的検査で落ちる。

## 基準に入れ忘れた軸

task.md の背景には「人間がレビューする」と書いたのに、**レビュー容易性を受け入れ基準に入れ忘れた。** Opus の SPEC.md は1,175行あり、人間が通読して承認できるかは別問題。Fable の言語は小さく、実装コストも学習コストも低い。**この軸を入れていたら判定は割れていた可能性がある。**

rubric が Opus に有利な構成になっていた、というのが今回一番の反省点。→ [[llm-comparison-forgotten-criteria-flip-the-verdict]]

## 限界

- **n=1。** 分散を測っていない。この差がモデル差か運かは、この結果だけでは言えない。
- **ブラインド判定していない。** どちらの出力か知った上で採点した。基準ごとに `file:line` の根拠を付けてバイアスを抑えたが、完全ではない。

生の成果物は `docs/model-eval/2026-08-09-spec-dsl/` に格納（サイトには出さない）。

## Links

- [[claude-fable-5-costs-double-opus-5-per-token]] — 単価の事実。総額が逆転した前提になる
- [[llm-comparison-forgotten-criteria-flip-the-verdict]] — この実験から得た運用上の教訓
