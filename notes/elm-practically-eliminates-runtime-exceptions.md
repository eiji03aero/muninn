---
title: Elmは実行時例外を実用上ほぼ消しているが、それはJS相互運用をportsに限る代金の上に成り立つ
created: 2026-08-12
kind: knowledge
tags: [dev/frontend]
recall: "Elm が「コンパイルが通れば実行時例外が出ない」を達成できている理由は何か。TypeScript の型安全性とはどう質が違い、その保証の代金は何か。"
srs:
  last: null
  interval: 0
  ease: 2.5
  next: 2026-08-12
---

Elm は「コンパイルが通れば実行時例外が出ない」を実用上ほぼ達成している。理由は言語設計側にある。

- `null` / `undefined` が言語に存在しない（`Maybe` / `Result` で表す）
- 例外機構がない
- 直和型のパターンマッチが**網羅を強制**される
- 外部データの境界（JSONパース等）で `Decoder` を書かせ、型を強制する

TypeScript との差は**保証の質**。TS は後付けの層で、`any` で抜けられ、外部データの境界で嘘をつける（デコードを書かなくてもコンパイルが通る）。**保証の強さは Elm、適用範囲の広さは TypeScript。**

そしてこの保証には価格がある。**Elm から JS を呼ぶ手段は ports（非同期メッセージパッシング）だけで、同期的な FFI が存在しない。** npm の任意のライブラリをその場で呼べないのは「不便」ではなく、安全性を買った代金そのもの。決済SDKやリッチエディタを使うたびに境界を自分で敷設することになる。

## Links
- [[the-elm-architecture]] — この知識の出所（UIアーキテクチャのアトラス）
- [[the-elm-architecture-is-a-model-update-view-loop]] — 網羅性の利得が効く場所（update の case）
