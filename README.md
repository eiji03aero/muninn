# muninn

個人ナレッジベース。オーディンの大鴉 Muninn（記憶）にちなむ。

Claudeで調べて学んだ知識を、ツェッテルカステン的に蓄積・リンク・見直しするためのリポジトリ。

- **正本はこのリポジトリのmarkdown群**。Obsidianは閲覧専用ビューア（任意）。
5つのconcern —— **① 客観知識の蓄積（`notes/`）／ ② スキル・対象のフォロー（`follows/`）／ ③ 想起と定着（`/mn-brief`・`/mn-review`）／ ④ 体系的な学習（`atlas/`・`/mn-learn`）／ ⑤ トピック別の記録（`logs/`・`/mn-log`）** —— を相互リンクで有機的に繋ぐ。「今どの機能を使っているか」を意識せず使えるよう、キャプチャは統一入口 `/mn` に集約できる。

- **統一入口** `/mn`: 何を投げても内容を判定し、客観知識ノート / insight / フォロー観測 / フォロー新設 / 人物ドシエ / inbox退避 に自動で仕分け・相互リンクして記録する。種別を意識させないフロントドア。
- **直接ルート** `/mn-research`: 調べた客観知識をその場で原子化して `notes/` / `moc/` に記録する（明示的に記録を頼まれたときだけ）。
- **inboxルート** `/mn-process-inbox`: その場で原子化できないもの（スマホの雑メモ、チャット結果の貼り付け）は `inbox.md` に溜めて後日バッチ処理する。
- **フォロー（定点観測）ルート** `/mn-follow`: スキルや興味のある対象（例: ゴルフの飛距離、好きなサッカーチーム）を定点観測する。写真・計測値・観戦所見をアップロード→分析→記録→ `follows/` に時系列で記録し、変遷を追う。
- **収集ルート** `/mn-collect`: フォローの収集スペック `collect.md`（watchlist・深掘り選手・日程・ライバル）に沿って近況（直近フォーム・動画・日程）を集めて反映し、収集ダイジェストを残す。設定の逐次調整もこのルート。
- **学習アトラスルート** `/mn-learn`: トピックを知識グラフ＋読む順路（ルート）で体系的に学ぶ。概念を読み物として執筆し、覚える価値のある知識は `notes/` に蒸留する。GitHub Pages で「マップ／ルート」を読み進める。
- **ログ（記録帖）ルート** `/mn-log`: 「コーヒー豆」「ハンドドライヤー」等のトピックを、最初に設計した記録項目（スキーマ）で一貫して記録する。写真＋ひと言を毎回スキーマに整形して1件ずつ蓄積し（画像は圧縮してコミット）、GitHub Pages で一覧・比較する。
- **想起ルート** `/mn-brief`: 蓄積を横断合成して対象の「予習ブリーフィング」を作る（試合前の見どころ、関連知識、想起クイズ）。
- **クイズルート** `/mn-review`: `kind: knowledge` の復習期限ノートから1問出題し、間隔反復で定着させる。
- 補助ツール `node scripts/mn-status.mjs`: 復習期限・アクティブなフォローを一覧するダッシュボード。
- すべてmainに直コミット。人間はサマリと `git show` で事後レビューし、問題があれば `git revert` で戻す。
- 運用ルールの詳細は [CLAUDE.md](CLAUDE.md) を参照。

```
inbox.md          # 捕捉用（その場で原子化できなかったものの受け皿）
notes/            # 原子ノート（1ノート1アイデア）。kind: knowledge / insight
moc/              # Map of Content（home.md が入口）
follows/          # フォロー（定点観測）。1対象1ディレクトリ。profile / entities / sessions / collect.md
atlas/            # 学習アトラス。1トピック1ディレクトリ。atlas.md（ハブ＋ルート）/ concepts/
logs/             # ログ（記録帖）。1トピック1ディレクトリ。topic.md（スキーマ）/ entries/ / images/
templates/        # note.md / follow-*.md / collect.md / atlas.md / concept.md / log-topic.md / log-entry.md
scripts/          # 補助ツール（mn-status.mjs = ダッシュボード。依存ゼロ）
.claude/skills/   # 作業手順（mn-capture / mn-research / mn-process-inbox / mn-regen-moc / mn-review / mn-follow / mn-collect / mn-brief / mn-learn / mn-log）
```
