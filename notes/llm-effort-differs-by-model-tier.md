---
title: effort が何を増やすかはモデルによって違う（探索のスイッチ／深さの調整）
created: 2026-08-11
kind: insight
tags: [dev/llm]
---

同じお題を Sonnet 5 と Opus 5 に、medium / high / xhigh の3段階で投げて比べたところ、**effort を上げたときに増えるものがモデルごとに違った**。

- **Sonnet の effort は「調べに行くかどうか」のスイッチだった。** リポジトリを読ませる題で、medium は 5回とも 1〜2回、high でも 5回とも 2〜4回しかツールを呼ばない——つまり自動読み込みされるファイル以外を**ほぼ読まずに**答えていた。xhigh で初めて12回になり、実装ファイルまで到達した。**閾値が medium と high の間ではなく、high と xhigh の間にある。**
- **Opus の effort は「どこまで掘るか」の調整だった。** 同じ題で medium が 4, 6, 6, 9, 11（5回・中央値6）と、既に探索している側から始まる。

数値は n=5 で取り直したもの。**当初 n=1 で観測した「opus/medium は11回」は5回中の最大値**で、代表値ではなかった。中央値で見ると 2 対 6 の差で、Sonnet/high の最大(4)と Opus/medium の最小(4)は接触する。**「Sonnet が xhigh でようやく届く深さに Opus は medium で届く」は言い過ぎ**で、正しくは「中央値で2〜3倍、ただし分布は端で重なる」。

出力の伸び方も逆だった。Sonnet は思考トークンが3.5倍（2,473→8,779）に増えても**返答は 2,572→2,368文字とむしろ短くなる**。Opus は 3,447→3,990文字と伸びる。Sonnet の effort は「考えるが書かない」、Opus の effort は「考えて書く」。

**運用上の含意はここ。** 「安いモデルの effort を上げれば高いモデルの代わりになる」は成り立たない。effort を上げて増えるのは**深さと確実性**であって、**見える範囲の広さではない**。Sonnet は effort を上げると取りこぼしを拾うようになる（仕様の穴を medium では直せず high で直せた）が、**指摘の総数は2件のまま頭打ち**で、Opus が medium で出した4件に effort では届かなかった。

したがって選ぶ順序は「まずモデル、次に effort」。安いモデルを xhigh で回すより、良いモデルを medium で回すほうが速くて安い場合がある（罠入り仕様の題では Opus/medium が Sonnet/high より安く速く指摘も多かった）。

**確度は軸によって違う。** 探索量の差は n=5 で取り直したので信じてよい。**指摘数の差はまだ n=1** で、追試していない（→ [[most-striking-n1-observation-is-likely-noise]]）。

## Links
- [[most-striking-n1-observation-is-likely-noise]] — このノートの数値を訂正させた追試。当初あった「上位モデルが調査を省く」という例外は再現せず取り下げた
- [[llm-eval-verifiable-axes-discriminate]] — この差を観測するために、どんな評価軸が必要だったか
- [[claude-code-effort-flag-batch-eval]] — 測定に使った仕組み
