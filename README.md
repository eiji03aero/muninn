# muninn

個人ナレッジベース。オーディンの大鴉 Muninn（記憶）にちなむ。

Claudeで調べて学んだ知識を、ツェッテルカステン的に蓄積・リンク・見直しするためのリポジトリ。

- **正本はこのリポジトリのmarkdown群**。Obsidianは閲覧専用ビューア（任意）。
- **直接ルート** `/mc-research`: Claude Codeに調査を依頼すると、その場で原子化して `notes/` / `moc/` に記録される。
- **inboxルート** `/mc-process-inbox`: その場で原子化できないもの（スマホの雑メモ、チャット結果の貼り付け）は `inbox.md` に溜めて後日バッチ処理する。
- どちらもmainに直コミット。人間はサマリと `git show` で事後レビューし、問題があれば `git revert` で戻す。
- 運用ルールの詳細は [CLAUDE.md](CLAUDE.md) を参照。

```
inbox.md          # 捕捉用（その場で原子化できなかったものの受け皿）
notes/            # 原子ノート（1ノート1アイデア）
moc/              # Map of Content（home.md が入口）
templates/note.md # ノートテンプレート
.claude/skills/   # 作業手順（mc-research / mc-process-inbox / mc-regen-moc）
```
