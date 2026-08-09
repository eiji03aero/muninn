---
title: Claude Fable 5 のトークン単価は Opus 5 のちょうど2倍
created: 2026-08-09
kind: knowledge
tags: [dev/llm]
srs:
  last: null
  interval: 0
  ease: 2.5
  next: 2026-08-09
---

Claude Fable 5 は入力 $10 / 出力 $50（per MTok）、Claude Opus 5 は入力 $5 / 出力 $25。**入出力ともにちょうど2倍**の価格差になっている。Fable 5 は「最も高性能な一般提供モデル」という位置づけで、Opus 5 は同じ 1M コンテキスト・128K 出力を持ちながら半額。

単価が2倍だからといって**総額が2倍になるとは限らない**。総額 = 単価 × トークン量であり、モデルによって同じ仕事に費やす出力量が大きく違うため、単価の高いモデルのほうが安く上がることが実際に起きる。単価だけでモデルを選ぶと判断を誤る。

## Links

- [[llm-comparison-forgotten-criteria-flip-the-verdict]] — この単価差が実測で逆転した事例の教訓
