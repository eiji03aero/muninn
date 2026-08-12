---
title: ReduxはElmに着想を得ており、Reactに欠けていた状態の一望性を外付けで補うものだった
created: 2026-08-12
kind: knowledge
tags: [dev/frontend]
recall: "Redux は何を補うために生まれ、どこから着想を得たか。導入すると React は何を得て何を失うか。"
srs:
  last: null
  interval: 0
  ease: 2.5
  next: 2026-08-12
---

React は状態の置き場所を決めてくれない（`useState` として散在し、Context にも外部ストアにもある）ため、**「いま、このアプリはどういう状態か」に一箇所で答えられない**。これを外付けで補ったのが Flux（単方向データフローの規約）と **Redux**（単一ストア＋純粋なリデューサ）で、Redux は **The Elm Architecture から明示的に着想を得ている**。Redux DevTools がタイムトラベルできるのは、Elm のデバッガと同じ原理（単一の状態値＋純粋な遷移関数＋アクションの記録）に立つため。

ただし **Redux を入れた React は「TEA のボイラープレートを、Elm ほどの型の保証なしで払う」状態に近づく**。近年 Zustand や Jotai のような軽量ストアが好まれるのは、この請求書を値切る動きと読める。

## Links
- [[elm-returns-side-effects-as-data-so-update-stays-pure]] — Redux が輸入した発想の原型
- [[react-colocates-state-while-tea-centralizes-it]] — 補おうとしている「状態の置き場所」の軸
- [[react-model]] — この知識の出所（UIアーキテクチャのアトラス）
