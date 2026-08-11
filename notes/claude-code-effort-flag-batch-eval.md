---
title: Claude Code は --model と --effort を起動時フラグで渡せるので、モデル×effort を非対話で回せる
created: 2026-08-11
kind: knowledge
tags: [dev/llm]
recall: "Claude Code でモデルと effort の組み合わせを多数回して比較したいとき、対話の /effort を使うと何が問題になるか。代わりに何を使い、結果の計測値はどこから取るか。"
srs:
  last: null
  interval: 0
  ease: 2.5
  next: 2026-08-11
---

Claude Code CLI には `--model`（sonnet / opus 等）と `--effort`（`low` / `medium` / `high` / `xhigh` / `max`）の**起動時フラグ**がある。`-p`（print モード）と組み合わせると、1コマンド1ケースの非対話実行になる。

```
claude -p "$(cat task.md)" --model opus --effort xhigh --output-format json
```

**対話セッション内の `/effort` を使ってはいけない。** そのモデルに launch-default effort hold がかかっている間、`/effort` は `Not applied` を返して**何も起きない**。気づかずに回すと medium と xhigh が同じ設定で走り、比較実験そのものが無意味になる。起動時フラグならこの事故が構造的に起きない。

`--output-format json` にすると、返答本文（`.result`）に加えて計測値が同じJSONに入る。

| 取れるもの | パス |
|---|---|
| 返答本文 | `.result` |
| 実際に使われたモデル | `.modelUsage` のキー |
| 出力トークン | `.modelUsage[].outputTokens` |
| 実コスト | `.total_cost_usd` |
| ターン数（＝探索量の代理指標） | `.num_turns` |

`num_turns` が特に効く。**1〜2 ならツールをほぼ使わずに答えている**（＝ファイルも Web も見ていない）ことがそのまま読み取れるので、「調べたうえでの答え」か「記憶からの答え」かを外形的に判別できる。

なお `WebSearch` / `WebFetch` は内部で小型モデルを使うため、`.modelUsage` に `claude-haiku-*` が混ざることがある。指定したモデルが効いていないわけではない。

## Links
- [[llm-effort-differs-by-model-tier]] — このフラグで測って分かった、effort の意味のモデル差
- [[higher-tier-model-may-skip-research]] — `num_turns` で検出できた挙動の実例
