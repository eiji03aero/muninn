---
title: Reactのモデル — コンポーネント単位の f(state) を合成する
atlas: ui-architecture
kind: concept
created: 2026-08-12
gist: UIを「状態から要素ツリーを返す関数」の合成として書き、状態も副作用もコンポーネントに局所化する。純粋なのはレンダー中だけで、外側の設計は開発者の裁量に委ねられる。
edges:
  requires: [ui-as-state-projection]
  contrasts: [the-elm-architecture, fine-grained-reactivity]
  leads-to: [react-vs-tea, flux-and-redux, react-server-components]
  elaborates: []
status: written
notes:
  - virtual-dom-buys-a-programming-model-not-raw-speed
  - react-colocates-state-while-tea-centralizes-it
  - redux-was-inspired-by-the-elm-architecture
tags: [dev/frontend]
---

React（Meta、2013年公開）の思想は、[[ui-as-state-projection|状態を画面へ写す問題]]に対する答えとしては、こう要約できる。**`view = f(state)` を、アプリ全体に対して一発で書くのではなく、部品（コンポーネント）ごとの小さな `f` に分割して合成する。**

分割の単位はUIの部品だ。ボタン、フォーム、ページ。それぞれが自分の `f` を持つ。だから React の基本単位は「関数」であり、「クラス」でも「テンプレート」でもない。

### 構造 — 要素ツリーを返し、照合してDOMに当てる

React コンポーネントは、外から渡される `props` と自分が持つ `state` を受け取り、**React 要素のツリー**を返す関数だ。ここで返るのは実DOMではない。「こういうDOMであってほしい」という**設計図の値**にすぎない。

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count - 1)}>-</button>
      <span>{count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

`setCount` が呼ばれると、React はこのコンポーネント（と、必要ならその子孫）を**もう一度呼び直す**。新しい設計図と前回の設計図を突き合わせ（**照合＝reconciliation**）、違う部分だけを実DOMに適用する。この「設計図の中間表現」が俗に **仮想DOM（Virtual DOM）** と呼ばれるものだ。

ここで誤解しやすい点がある。**仮想DOMは速度のための発明ではない。** 熟練者が手で書いた最小限のDOM操作より速くなることはない——余計な木を毎回作っているのだから当然だ。仮想DOMが買っているのは**プログラミングモデル**のほうで、「毎回全部書き直す」という乱暴で分かりやすい書き味を、実用に耐える速度で成立させるための装置である。この点は [[fine-grained-reactivity|細粒度リアクティビティ]]（Solid や Svelte が採る、そもそも再実行しない方式）と比べると輪郭がはっきりする。

### 状態 — できるだけ近くに置く（コロケーション）

React が推すのは、**状態を使う場所のいちばん近くに置く**という原則だ。カウンタの数値はカウンタが持てばいい。誰にも共有しないなら、誰にも見せない。

共有が必要になったら、共通の親へ**持ち上げる（lifting state up）**。持ち上げた結果、途中の階層をバケツリレーするのが辛くなったら `Context` を使う。それでも足りなければ Redux / Zustand / Jotai といった外部ストアを入れる。

つまり **React は「状態をどこに置くか」を決めてくれない。** 段階的な逃げ道を用意しているだけだ。これは自由であると同時に、**アプリ全体の状態が構造として存在しない**ことを意味する。「いま、このアプリはどういう状態か」に一箇所で答えられない。デバッグのときに効いてくるのはここで、[[flux-and-redux|Flux / Redux]] のような外付けの規律が生まれた動機でもある。

### 副作用 — レンダーの外に出す「逃がし弁」

React が純粋性を要求するのは**レンダー中だけ**だ。コンポーネント関数の実行中にHTTPを叩いたりDOMを直接触ったりしてはいけない。ではどこでやるのか。`useEffect` である。

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);   // 後始末
}, []);
```

`useEffect` は「描画が済んだ後に、この任意のJavaScriptを実行してくれ」という指示だ。**中身は何でもよく、型にも現れない。** 依存配列の書き忘れ、後始末の漏れ、二重発火——React の実務的なバグの多くがここに集中するのは偶然ではない。純粋な島（レンダー）の外に、無制限の海（副作用）が広がっている構造だからだ。

近年の React はこの海を減らす方向に動いている。React 19 の Actions や `use`、`useTransition` は、非同期処理を「effect を手で書く」から「フレームワークに宣言する」へ寄せる試みだ。ただし `useEffect` が消えたわけではない。

### 型と網羅性

React は JavaScript のライブラリであり、TypeScript は後付けの層だ。`props` の型やイベントの型は付くし、実務では十分に効く。しかし **「起こりうる出来事の全列挙」や「状態遷移の網羅性」は型で保証されない。** 状態は `useState` の呼び出しとして散在しているので、「この状態のときこのボタンは押せないはず」という不変条件はコードのどこにも書かれず、レビューと祈りで守られる。

### 現在地

2026年8月時点の最新は 19系（19.2.7、2026年6月）。設計上の大きな変化は **React Compiler が 1.0 として安定版になった**こと（2025年10月）で、これまで `useMemo` / `useCallback` として人間が手で書いていたメモ化をビルド時に自動挿入する。**「宣言的に書き、最適化はツールがやる」という当初の理想に、10年越しで一歩近づいた**と見ることができる。

もうひとつの大きな軸が [[react-server-components|React Server Components]] で、これは `f(state)` の `f` の一部をサーバーで実行してしまう方向への拡張だ。ここまで来ると「UIライブラリ」というより、クライアントとサーバーにまたがるアプリケーションモデルの話になる。

React のこうした自由さと拡張の速さは、[[the-elm-architecture|The Elm Architecture]] の「一つの型に全部を押し込む」厳格さと真っ向から対照的だ。次はその厳格な側を見る。
