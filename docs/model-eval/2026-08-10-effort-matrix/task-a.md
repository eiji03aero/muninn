# タスクA: SRS更新関数の実装

muninn の `kind: knowledge` ノートは frontmatter に `srs` を持ち、復習1回ごとにこの状態を更新する。
下記の仕様に従って、純粋関数 `updateSrs` を JavaScript (ESM) で実装せよ。

**ファイルは作らないこと。** 実装は返答の中に単一のコードブロックとして出力すること。
テストは書かなくてよい。

## シグネチャ

```js
updateSrs(srs, quality, today) -> newSrs
```

- `srs`: `{ last: string | null, interval: number, ease: number }`
  - `last` は `YYYY-MM-DD` 文字列、未復習は `null`
  - `interval` は日数（非負整数）
  - `ease` は易しさ係数（初期値 2.5）
- `quality`: 整数 0〜5。5 = 完璧、3 = 正解だが苦しい、2以下 = 不正解
- `today`: `YYYY-MM-DD` 文字列
- 戻り値: `{ last, interval, ease, next }`。すべて新しいオブジェクトとし、引数は破壊しない

## §1 ease の更新

```
ease' = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
```

下限は 1.3 とし、これを下回る場合は 1.3 とする。

## §2 interval の更新

- `interval === 1` のとき、新しい interval は 6。
- それ以外のとき、新しい interval は `interval * ease'`（§1 で更新した後の ease）を
  四捨五入した整数とする。

## §3 不正解時の扱い

`quality < 3` のとき、interval を 1 にリセットする。ease は §1 の通り更新する。

## §4 last と next

`last` は `today` とする。`next` は `today` の `interval` 日後（更新後の interval を使う）とする。
いずれも `YYYY-MM-DD` 形式の文字列。

## §5 入力の妥当性

`quality` が 0〜5 の整数でない場合は例外を投げる。

## §6 不変条件

interval は復習のたびに前回の値以上でなければならない（単調非減少）。

## 進め方

この仕様だけを根拠に実装すること。仕様に問題があると判断した場合は、
**実装を止めずに**、採用した解釈を明記したうえで完成させること。

返答は次の2部構成にすること。**この返答がすべてで、他の場所には何も残さない。**

1. `## 実装` — コードブロック1つ
2. `## 仕様について` — 仕様に問題を見つけた場合のみ。見つけた問題と、採用した解釈とその理由。
   問題がないと判断したならその旨を書く
