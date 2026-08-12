---
title: The Elm Architecture は単一Model・Msgの全列挙・純粋なupdate/viewの閉じたループ
created: 2026-08-12
kind: knowledge
tags: [dev/frontend]
recall: "TEA を構成する要素（Model / Msg / update / view）とそれぞれの役割は。React と比べて決定的に違う点は何か。"
srs:
  last: null
  interval: 0
  ease: 2.5
  next: 2026-08-12
---

**The Elm Architecture（TEA）** は Elm でアプリを書くと自然にそうなる構造。要素は4つだけ。

- `Model` — アプリの状態、**全部**をひとつの型で持つ
- `Msg` — 起こりうる出来事の**全列挙**（直和型）
- `update : Msg -> Model -> Model` — 出来事＋現状から次の状態を作る**純粋関数**
- `view : Model -> Html Msg` — 状態から画面を作る**純粋関数**（返るのは実DOMでなく、Msgへの配線を含んだ値）

ループを回すのはランタイムで、開発者は部品だけを書く。

React との決定的な違いは、**出来事の「宣言」（Msg）と「解釈」（update）が分離している**こと。React の `onClick={() => setCount(count + 1)}` は両者が癒着している。分離の利得は網羅性で、`Msg` を増やすと `update` の `case` の抜けをコンパイラが指摘するため、**「新しい出来事に対応し忘れた」バグが原理的に成立しない**。ただしこれは Elm の直和型＋網羅的パターンマッチがあって初めて得られる利得で、TEA の構造だけを他言語に移植しても付いてこない。

弱点は**合成**。画面が増えると `Model` / `Msg` が巨大な入れ子になり、子を組み込むたびに Model埋め込み・Msgラップ・`Html.map`・`Cmd.map` の4箇所の配線が要る（局所性を捨てて一望性を買った代償）。

## Links
- [[the-elm-architecture]] — この知識の出所（UIアーキテクチャのアトラス）
- [[elm-returns-side-effects-as-data-so-update-stays-pure]] — update を純粋に保つための仕掛け（Cmd / Sub）
- [[react-colocates-state-while-tea-centralizes-it]] — 状態の置き場所という軸での対比
