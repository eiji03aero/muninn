---
title: The Elm Architecture — Model / Update / View の閉じたループ
atlas: ui-architecture
kind: concept
created: 2026-08-12
gist: アプリ全体を単一のModelと二つの純粋関数に畳み、副作用すら Cmd というデータとして返してランタイムに実行させる。純粋性を守り切ることで、型検査が状態遷移の抜けまで拾う。
edges:
  requires: [ui-as-state-projection]
  contrasts: [react-model]
  leads-to: [react-vs-tea, flux-and-redux, effects-as-data]
  elaborates: []
status: written
notes:
  - the-elm-architecture-is-a-model-update-view-loop
  - elm-returns-side-effects-as-data-so-update-stays-pure
  - elm-practically-eliminates-runtime-exceptions
tags: [dev/frontend]
---

**Elm** は Evan Czaplicki が2012年に発表した、Webフロントエンド専用の関数型言語だ。JavaScriptにコンパイルされる。ここで扱う **The Elm Architecture（TEA）** は、Elm でアプリを書くと自然にそうなる構造のことで、言語機能というより**発見された型**に近い。Elm 自身は当初 FRP（関数型リアクティブプログラミング）の signal を土台にしていたが、2016年の 0.17 でそれを捨て、TEA へ純化した経緯がある。「抽象を足す」ではなく「抽象を削る」方向に進んだ言語だ。

[[ui-as-state-projection|状態を画面へ写す問題]]の二つの分岐点——状態をどこに置くか、副作用をどう扱うか——に対する TEA の答えは、どちらも極端に単純である。**状態はひとつ。副作用は書かせない。**

### 構造 — 三つの部品と一つのループ

TEA のアプリは、次の要素だけでできている。

- **`Model`** — アプリの状態、**全部**。ひとつの型。
- **`Msg`** — このアプリで起こりうる出来事の**全列挙**。直和型（union type）で書く。
- **`update : Msg -> Model -> Model`** — 出来事と現在の状態から、次の状態を作る**純粋関数**。
- **`view : Model -> Html Msg`** — 状態から画面を作る**純粋関数**。返るのは実DOMではなく `Html Msg` という値で、「このボタンが押されたら `Increment` という `Msg` を出す」という配線まで含んだ設計図だ。

ランタイムがループを回す。view が返した設計図を描画し、ユーザー操作が `Msg` になり、`update` に流れ、新しい `Model` ができ、また view が呼ばれる。**開発者は輪を書かない。輪の中身の部品だけを書く。**

カウンタを書くとこうなる。

```elm
type alias Model = Int

type Msg
    = Increment
    | Decrement

update : Msg -> Model -> Model
update msg model =
    case msg of
        Increment -> model + 1
        Decrement -> model - 1

view : Model -> Html Msg
view model =
    div []
        [ button [ onClick Decrement ] [ text "-" ]
        , text (String.fromInt model)
        , button [ onClick Increment ] [ text "+" ]
        ]
```

[[react-model|React のカウンタ]]と見比べてほしい。行数はほとんど変わらない。しかし決定的に違うのは、**「起こりうること」が `Msg` として名前を持って列挙されている**点だ。React では `onClick={() => setCount(count + 1)}` と、出来事と状態変更が同じ場所で癒着している。Elm では出来事の**宣言**（`Msg`）と**解釈**（`update`）が分離している。

この分離が効いてくるのは、`Msg` を増やしたときだ。`Msg` に `Reset` を足すと、`update` の `case` が網羅していないことをコンパイラが即座に指摘する。**「新しい出来事を足したのに、この画面だけ対応を書き忘れた」というクラスのバグが、原理的に成立しない。** これは Elm の型システムが直和型と網羅的パターンマッチを備えているからで、TEA という構造だけを他言語に移植しても、この利得は付いてこない。

### 副作用 — 実行せず、データとして返す

実アプリはHTTPを叩く。だが `update` は純粋関数でなければならない。矛盾するように見える。TEA の解決は鮮やかだ。**副作用を実行するのではなく、「これをやってくれ」という指示書を値として返す。**

`update` の本当の型はこうなる。

```elm
update : Msg -> Model -> ( Model, Cmd Msg )
```

`Cmd Msg` が指示書だ。「このURLにGETして、結果を `GotUser` という `Msg` にして戻してくれ」という**データ**であって、リクエストそのものではない。実行するのはランタイム。結果は必ず `Msg` としてループの入口に戻ってくる。外界からの入力（時刻、WebSocket、キー入力）も同じ発想で、`subscriptions : Model -> Sub Msg` として**購読を宣言**する。

だから **Elm のコードには副作用が一箇所も存在しない。** `update` のテストは「この `Msg` とこの `Model` を渡したら、この `Model` とこの `Cmd` が返る」を比べるだけで済む。HTTPのモックも、時間の凍結も、非同期の待ち合わせもいらない。純粋関数の等値比較に落ちている。この「副作用をデータにする」考え方自体は他所にも応用が利くので、[[effects-as-data]] として別に切り出してある。

もうひとつの帰結が **タイムトラベルデバッガ**だ。状態がひとつの値で、遷移が `Msg` の列で、`update` が純粋なら、`Msg` を記録しておけば任意の時点を完全に再現できる。Elm には実際に標準で付いている。Redux DevTools が同じことをできるのは偶然ではない——[[flux-and-redux|Redux は Elm から明示的に着想を得ている]]。

### 代償 — 合成とJS連携

いいことばかりではない。TEA の最大の弱点は**合成**だ。

`Model` がひとつということは、画面が増えれば `Model` も `Msg` も巨大な入れ子になるということだ。子コンポーネントを作ると、その `Model` を親の `Model` に埋め、子の `Msg` を親の `Msg` でラップし、`view` の結果を `Html.map` で、`Cmd` を `Cmd.map` で変換する——という定型作業（いわゆる TEA components）が要る。React が `useState` 一行で済ませるところに、四箇所の配線が必要になる。**部品の独立性を、全体の見通しと引き換えに差し出している。**

もうひとつは **JavaScript との境界**だ。Elm から JS を呼ぶ手段は **ports** だけで、これは非同期のメッセージパッシングに限られる。同期的な FFI は存在しない。npm にある任意のライブラリをその場で呼ぶ、ということができない。安全性の保証（後述のランタイム例外の話）はこの厳格さの上に成り立っているので、これは「不便」ではなく**価格**である。

### 現在地 — 停滞か、完成か

Elm は 0.19.1（2019年10月）以降、長く新リリースがなかった。この沈黙は「死んだ言語」という評価を招いた。

しかし2026年7月6日に **0.19.2** が出ている。言語仕様の変更はなく、コンパイラの性能改善のみ。アナウンスによれば、これは 1.0 に向けた**小さな非破壊リリースの連続**の始まりだという。作者は並行して、Elm の考え方をバックエンド／データベース領域に持ち込む **Acadia** という別言語にも取り組んでいる。

この状況の読み方は割れる。**「コアは完成しており、壊れていないものを直す必要がない」**という見方と、**「7年近く動きが止まっていた言語に本番を預けられない」**という見方は、どちらも同じ事実から出ている。技術選定では、この評価の分岐そのものが判断材料になる。

さて、二つの答えが出揃った。どちらが優れているのか——という問いは、実は指標を決めないと意味をなさない。次の [[react-vs-tea]] で、軸ごとに突き合わせる。
