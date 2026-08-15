---
title: 内容を言い切るタイトル
created: YYYY-MM-DD
kind: knowledge        # knowledge=調査で得た客観知識（クイズ対象） / insight=自分の知見・身体知（対象外）
tags: [dev/example]
recall: "このノートで思い出したいことを問いの形で。"   # kind: knowledge のときだけ付ける。
                       # サイトの「想起カード」がタイトルを伏せてこの問いだけを見せる。
                       # 付け忘れると degrade 表示になる（web/DESIGN.md §9）。
srs:                   # kind: knowledge のときだけ付ける。insight では srs ごと省略する
  last: null           # 最後に復習した日（YYYY-MM-DD）。未復習なら null
  interval: 0          # 現在の復習間隔（日）
  ease: 2.5            # 易しさ係数（SM-2）。最低 1.3
  next: YYYY-MM-DD     # 次の復習日。新規は作成日にして即対象化する
---

自分の言葉での要約。1ノート1アイデアを守る。

## Links
- [[related-note]] — なぜ関連するか一言
