---
title: Elmは副作用を実行せず Cmd というデータとして返すので update が純粋なまま保たれる
created: 2026-08-12
kind: knowledge
tags: [dev/frontend]
recall: "純粋関数である update から HTTP を叩くという矛盾を、TEA はどう解いているか。その帰結として何ができるようになるか。"
srs:
  last: null
  interval: 0
  ease: 2.5
  next: 2026-08-12
---

実アプリは HTTP を叩くのに、TEA の `update` は純粋関数でなければならない。TEA の解決は、**副作用を実行するのではなく「これをやってくれ」という指示書を値として返す**こと。

```elm
update : Msg -> Model -> ( Model, Cmd Msg )
```

`Cmd Msg` は「このURLにGETして結果を `GotUser` という Msg にして戻せ」という**データ**であり、リクエストそのものではない。実行するのはランタイムで、結果は必ず `Msg` としてループの入口に戻る。外界からの入力（時刻・WebSocket・キー入力）も `subscriptions : Model -> Sub Msg` として**購読を宣言**する。結果として **Elm のコードには副作用が一箇所も存在しない**。

帰結は2つ。

1. **テストが値の比較に落ちる** — 「この Msg とこの Model を渡したらこの Model と Cmd が返る」を比べるだけ。HTTPのモックも時間の凍結も非同期の待ち合わせも不要。
2. **タイムトラベルデバッガが原理的に可能** — 状態が1つの値、遷移が Msg の列、update が純粋なので、Msg を記録すれば任意の時点を完全再現できる。

この「副作用をデータにする」型は Elm 固有ではなく、Redux / Bloc / Composable Architecture 等へ広く輸出されている。

## Links
- [[the-elm-architecture]] — この知識の出所（UIアーキテクチャのアトラス）
- [[the-elm-architecture-is-a-model-update-view-loop]] — 前提となるループの構造
- [[redux-was-inspired-by-the-elm-architecture]] — この発想が React 側へ輸出された経路
