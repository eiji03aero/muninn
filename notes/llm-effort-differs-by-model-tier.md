---
title: effort が何を増やすかはモデルによって違う（探索のスイッチ／深さの調整）
created: 2026-08-11
kind: insight
tags: [dev/llm]
---

同じお題を Sonnet 5 と Opus 5 に、medium / high / xhigh の3段階で投げて比べたところ、**effort を上げたときに増えるものがモデルごとに違った**。

- **Sonnet の effort は「調べに行くかどうか」のスイッチだった。** リポジトリを読ませる題で、medium と high はどちらもツール呼び出し2回——つまり自動読み込みされるファイル以外を**一度も読まずに**答えていた。xhigh で初めて12回になり、実装ファイルまで到達した。
- **Opus の effort は「どこまで掘るか」の調整だった。** 同じ題で medium の時点で11回探索しており、effort を上げても探索の有無ではなく深さが変わる。

出力の伸び方も逆だった。Sonnet は思考トークンが3.5倍（2,473→8,779）に増えても**返答は 2,572→2,368文字とむしろ短くなる**。Opus は 3,447→3,990文字と伸びる。Sonnet の effort は「考えるが書かない」、Opus の effort は「考えて書く」。

**運用上の含意はここ。** 「安いモデルの effort を上げれば高いモデルの代わりになる」は成り立たない。Sonnet は effort を上げると**取りこぼしを拾う**ようになる（仕様の穴を medium では直せず high で直せた）が、**指摘の総数は2件のまま頭打ち**で、Opus が medium で出した4件に effort では届かなかった。effort で埋まるのは深さと確実性であって、**見える範囲の広さは埋まらない**。

したがって選ぶ順序は「まずモデル、次に effort」。安いモデルを xhigh で回すより、良いモデルを medium で回すほうが速くて安い場合がある（実際に罠入り仕様の題では Opus/medium が Sonnet/high より安く速く指摘も多かった）。ただし逆転する題もあるので絶対ではない（→ [[higher-tier-model-may-skip-research]]）。

n=1 の観察なので、断定できるのは「はっきり出た差」だけ。ツール呼び出し 2 対 11 のような桁違いの差は拾ってよいが、「xhigh のほうが少し丁寧」程度は誤差として捨てる。

## Links
- [[higher-tier-model-may-skip-research]] — 「上位モデルほど調べる」が崩れる例。上の原則の重要な例外
- [[llm-eval-verifiable-axes-discriminate]] — この差を観測するために、どんな評価軸が必要だったか
- [[claude-code-effort-flag-batch-eval]] — 測定に使った仕組み
