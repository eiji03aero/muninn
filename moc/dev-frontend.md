---
title: フロントエンド — UIアーキテクチャと設計思想
created: 2026-08-12
tags: [moc]
---

UIを作るための設計思想まわりの索引。体系的に読むなら [[ui-architecture|UIアーキテクチャ（知識アトラス）]] が入口で、ここはそこから蒸留された原子ノートの一覧。

## 宣言的UIの前提

- [[declarative-ui-is-a-function-from-state-to-view]] — `view = f(state)`。守る不変条件が「同期」から「関数の正しさ」に縮む
- [[virtual-dom-buys-a-programming-model-not-raw-speed]] — 仮想DOMは速度の発明ではなく書き味を成立させる装置

## 状態をどこに置くか

- [[react-colocates-state-while-tea-centralizes-it]] — 分散（局所性）と集中（一望性）のトレードオフ
- [[redux-was-inspired-by-the-elm-architecture]] — Reactに欠けた一望性を外付けで買い戻す

## The Elm Architecture

- [[the-elm-architecture-is-a-model-update-view-loop]] — 単一Model・Msgの全列挙・純粋なupdate/view
- [[elm-returns-side-effects-as-data-so-update-stays-pure]] — 副作用を実行せず Cmd というデータとして返す
- [[elm-practically-eliminates-runtime-exceptions]] — 実行時例外がほぼ消えるが、その代金は ports の窮屈さ
