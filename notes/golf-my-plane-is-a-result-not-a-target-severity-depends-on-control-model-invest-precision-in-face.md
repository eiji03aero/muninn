---
title: 自分の理解の更新：プレーンは"乗せに行く対象"でなくデリバリーの結果なので「合わせる精度」の問題は発生しない。シビアさは制御モデル次第で、腕で乗せに行くと多変数の地獄、下半身始動なら従属変数が1つ増えるだけ。精度はプレーンでなくフェースに投資する
created: 2026-08-08
kind: insight
tags: [sports/golf]
---

「切り返し前のシャフトの傾きと、ハーフウェイダウンのプレーンの傾きが違うなら、プレーンに乗せるのは超シビアでは？」という疑問への整理。

**前提が間違っていた**：プレーンは空間に張ってある板ではなく、**ヘッドが通った軌跡としてあとから定義される面**（→ [[golf-swing-is-not-a-single-plane-kwon-functional-swing-plane-clubhead-plane-hands-tighter-circle-shaft-cone]]）。だから「正しい面に乗せる」という作業は存在せず、**良い順序で下ろした結果、良い面ができる**だけ。**"合わせる精度"の問題は、"乗せに行く"モデルを採ったときにだけ発生する**。

**傾きが変わるのは本当**：ローリーもトップでは立っていて切り返しで明確に寝る（しっかり面を乗り換えるタイプ）。しかも**乗り換えはP6までに完了**——「腕を下ろしてから面に合わせる」のでなく**下ろす過程そのものが乗り換え**。

**なぜシビアでないか**:
1. **原因が1つ**。下半身始動＋腕が落ちる、から慣性と重力で勝手に寝る。**調整している変数は"切り返しの始め方"だけ**で、シャフトの傾きは従属変数。腕で乗せに行くと本当に多変数になって破綻する（＝「全く当たらない日」の正体）。
2. **連続的でスナップでない**（0.1〜0.15秒かけて滑らか）＝タイミングの窓が広い。

**そして本当のシビアさはフェースにある**：許容差はプレーン＝数度、フェース＝1〜2度（→ [[golf-ball-flight-start-line-is-mostly-face-curve-is-face-minus-path-tolerance-asymmetry]]）。**精度を割く先を間違えない**——プレーンは"だいたい"でよく、**フェースはスイング中でなくグリップ・アドレス・手首の初期設定で先に決める**。

**実務**: 合わせるのは**切り返しの始め方だけ**（→ [[golf-my-driver-transition-feel-hips-lead-chest-delayed-drop-arms-to-p6-then-open-and-release]]）。P6のチェックは**答え合わせ**として使い、振りながら合わせない（→ [[golf-halfway-down-p6-square-checkpoint-shaft-parallel-face-matches-spine-flat-lead-wrist]]）。

## Links
- [[golf-ball-flight-start-line-is-mostly-face-curve-is-face-minus-path-tolerance-asymmetry]] — 許容差の非対称（この結論の根拠）
- [[golf-why-downswing-shallows-not-single-plane-reproducibility-from-sequence-not-fixed-plane]] — 再現性は"面の固定"でなく"順序の反復"から、の理論。この気づきの土台
- [[golf-my-driver-transition-feel-hips-lead-chest-delayed-drop-arms-to-p6-then-open-and-release]] — 合わせるべき唯一の対象＝切り返しの始め方
- [[golf-takeaway-by-feel-hands-in-and-lever-sets-good-return-reference-not-path-preview]] — 軌道をなぞる操作の危険（腕で乗せに行く＝これ）
