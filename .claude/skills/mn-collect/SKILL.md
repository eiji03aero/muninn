---
name: mn-collect
description: フォローの「収集スペック」(collect.md)を読み、それに沿って現主力の直近フォーム・動画・次戦日程・ライバルを収集して entity/profile/notes に反映し、収集ダイジェストを sessions に残して commit/push する。「収集して」「最新化して」「アルゼンチンの近況集めて」「〜を深掘りに追加して」などで発火。設定の逐次調整もこの skill が行う。
---

# mn-collect: 収集スペックに沿ってフォローの近況を集めて反映する

CLAUDE.md の規約（命名・原子化・リンク・タグ・**コミット運用**）に必ず従うこと。
目的は、**フォローごとに「何を・誰を・どれくらい追うか」を設定として持ち、それに沿って外部の近況を集めて muninn に取り込み続ける**こと。集めた結果はサイト（`web/`）にそのまま反映される。

## データ構造

```
follows/<name>/collect.md   # 収集スペック（設定）。kind: collect。templates/collect.md に従う
```

`collect.md` frontmatter の要点:
- `watchlist`: 直近の活躍＋動画を集める対象（entities の slug）
- `deep_dive`: watchlist より**深く**成長を追う対象（entities の slug）
- `collect`: 何を集めるか（`recent_form` / `videos` / `next_matches` / `rivals` のオン/オフ）
- `cadence`: 頻度の目安 / `sources`: 当て先・方針

## 2つのモード

### A. 収集を実行（「収集して」「最新化して」「近況集めて」）＝ メインループ

1. **最新化**: `git fetch origin` → ローカル `main` を remote 最新に（CLAUDE.md のコミット運用）。
2. **設定を読む**: `follows/<name>/collect.md` を読む（無ければ `templates/collect.md` から作成を提案）。`watchlist`/`deep_dive`/`collect` フラグ/`sources`/収集メモを把握する。
3. **収集（Web）**: `collect` フラグに従い一次情報優先で調べる（WebSearch/WebFetch）。**未確定・不明な情報は書かない**（推測でフィクスチャや数字を作らない）。
   - `recent_form`: watchlist 各選手のクラブでの直近パフォーマンス・移籍・受賞など。
   - `deep_dive` の選手はより深く（成長の観点＝何が伸び/課題か、複数ソース）。
   - `videos`: 各選手の**現在有効な** YouTube 検索語 or 安定URL。
   - `next_matches`: 代表の**確定した**次戦日程（未確定なら空のまま、その旨をダイジェストに書く）。
   - `rivals`: 必要なら更新。
4. **反映（markdownを更新）**:
   - **entity**（`entities/<slug>.md`）: `changelog` に1行追加（`{ date: "YYYY-MM", note: ... }`）、必要なら `clips` を更新、`status` 変化があれば直す、`updated` を今日に。`deep_dive` 対象は該当 entity の frontmatter `deep_dive: true` も揃える（サイトで ★ 表示）。
   - **profile**: `next_matches` / `rivals` / `snapshot` を最新化（**基準値・現状の書き換えは理由をコミットメッセージに明記**＝サイレント上書き禁止）。
   - **覚える価値のある客観知識**（新戦術・記録・移籍の事実など）が出たら、フォローに埋め込まず `/mn-research`（または `/mn`）で `notes/` に原子ノート化して `[[リンク]]`。
5. **ダイジェスト**: `follows/<name>/sessions/YYYY-MM-DD-collect.md` を `templates/follow-session.md` から作成し、「今回集めた要点・更新した entity/profile・未確定で見送った点・次回集めたいこと」を書く（＝収集の観測ログ）。
6. **collect.md 更新**: `updated` を今日に。収集メモに1行残す。
7. commit & push（意味ある単位で分割可: entity更新 / profile更新 / notes追加 / digest）。
8. **サマリ報告（必須）**: 更新した entity/profile/notes・未確定で見送った点・サイトに出る変化を報告する。

### B. 設定を調整（「メッシを深掘りに追加」「日程はもう追わない」「頻度を月1に」）＝ 逐次調整

1. 対象フォローの `collect.md` を読む。
2. 指示に従い frontmatter（`watchlist`/`deep_dive`/`collect`/`cadence` 等）を更新し、収集メモ欄に「日付: 調整内容・理由」を1行足す。`updated` を今日に。
3. `deep_dive` の増減は、該当 entity の `deep_dive` フラグも揃える（サイト表示の整合）。
4. commit & push。この調整は次回の「収集を実行」に効く。

## コミット運用（CLAUDE.md 準拠）

- push 前に必ず `git fetch origin` → ローカル `main` 最新化 → `main` にコミット → **remote `main` に push**。
- コミットメッセージ例:
  - `collect(argentina-nt): 近況を収集（エンソ/フリアンのフォーム更新、次戦は未確定）`
  - `collect(argentina-nt): 設定調整 — deep_dive にフリアンを追加（理由: 移籍で環境変化）`

## 注意

- **未確定を作らない**。日程・数字・移籍は確定ソースがある時だけ書く。不明はダイジェストに「未確定」と明記して空のままにする。
- 収集は `notes/` の知識を**消費・生産する両方**。事実知識は必ず `notes/` に切り出す（フォローに埋め込んで終わりにしない）。
- 写真・動画バイナリはコミットしない（clips は URL / 検索語のみ）。
- 一度に扱うフォローは1つ。
