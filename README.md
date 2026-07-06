# muninn

個人ナレッジベース。オーディンの大鴉 Muninn（記憶）にちなむ。

Claudeで調べて学んだ知識を、ツェッテルカステン的に蓄積・リンク・見直しするためのリポジトリ。

- **正本はこのリポジトリのmarkdown群**。Obsidianは閲覧専用ビューア（任意）。
- **直接ルート** `/mn-research`: Claude Codeに調査を依頼すると、その場で原子化して `notes/` / `moc/` に記録される。
- **inboxルート** `/mn-process-inbox`: その場で原子化できないもの（スマホの雑メモ、チャット結果の貼り付け）は `inbox.md` に溜めて後日バッチ処理する。
- **定点観測ルート** `/mn-track`: 上達したいスキル（例: ゴルフのドライバー飛距離）を定点観測する。写真・計測値をアップロード→分析→アドバイス→ `tracks/` に時系列で記録し、変遷を追う。
- すべてmainに直コミット。人間はサマリと `git show` で事後レビューし、問題があれば `git revert` で戻す。
- 運用ルールの詳細は [CLAUDE.md](CLAUDE.md) を参照。

```
inbox.md          # 捕捉用（その場で原子化できなかったものの受け皿）
notes/            # 原子ノート（1ノート1アイデア）
moc/              # Map of Content（home.md が入口）
tracks/           # 定点観測トラック（スキル上達の時系列ジャーナル）
templates/        # note.md / track-profile.md / track-session.md
.claude/skills/   # 作業手順（mn-research / mn-process-inbox / mn-regen-moc / mn-review / mn-track）
```
