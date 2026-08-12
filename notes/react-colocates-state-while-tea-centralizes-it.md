---
title: Reactは状態を使う場所に分散させTEAは単一Modelに集中させる——局所性と一望性のトレードオフ
created: 2026-08-12
kind: knowledge
tags: [dev/frontend]
recall: "React と TEA は「状態をどこに置くか」でどう分かれるか。それぞれ何を得て何を失っているか。"
srs:
  last: null
  interval: 0
  ease: 2.5
  next: 2026-08-12
---

同じ宣言的UI（`view = f(state)`）から出発しても、**状態の置き場所**で設計は割れる。

**React はコロケーション**（使う場所のいちばん近くに置く）を推す。共有が必要になったら共通の親へ**持ち上げ（lifting state up）**、辛くなったら Context、それでも足りなければ外部ストア、という段階的な逃げ道を用意する。得るのは**部品の独立性と記述の軽さ**、失うのは**一望性**——アプリ全体の状態が構造として存在しない。

**TEA は単一 `Model`** に全部を畳む。得るのは一望性（デバッグ・タイムトラベル・網羅性チェック）、失うのは**合成の軽さ**——子を組み込むたびに Model埋め込み・Msgラップ・`Html.map`・`Cmd.map` の配線が要る。

**どちらかが優れているのではなく、局所性と一望性のどちらを買うかの選択。** 「部品の再利用が多く要件が動く」なら分散側、「状態の整合性の破綻を最も恐れる」なら集中側に寄せるのが筋。React に Redux を足すのは、分散側から一望性を買い戻す動きにあたる。

## Links
- [[react-model]] — この知識の出所（UIアーキテクチャのアトラス）
- [[the-elm-architecture-is-a-model-update-view-loop]] — 集中側の具体形
- [[redux-was-inspired-by-the-elm-architecture]] — React 側で一望性を買い戻す手段
