# ゲームUI/HUD・ラジアルメニュー・物理デバイス操作・触覚フィードバック リサーチ

担当: ゲームUI/HUD、ラジアル（パイ）メニュー、物理デバイス的操作（ダイヤル/クラウン/ジョグ）、触覚フィードバック
対象: muninn（個人ナレッジベース閲覧PWA。読み専用・片手操作・ダーク固定・間隔反復「再読カード」が体験の心臓部）

---

## 1. 具体例集

### 1-1. パイメニュー（Pie Menus） — Don Hopkins, 1986〜／現役（研究として生き続けている）
- **仕組み**: 項目を中心から放射状・等距離に円環配置。方向で選ぶ。
- **削った操作コスト**: リニアメニューは「上から順に走査して距離が離れた項目ほど到達時間が伸びる」が、パイメニューは全項目が中心から等距離＝到達時間がほぼ一定になる。
- **なぜ効くか（データ）**: Callahan et al. 1988 の実証研究（被験者33名）で、パイメニューはリニアメニューより**選択時間が約15%速い**。メニュータイプ間の性能差は統計的に有意（p<0.01）。パイメニューの標的面積は3,500〜6,000px²（リニアは1,000〜2,000px²）で、Fittsの法則（到達時間は距離/標的サイズの対数に比例）に沿って標的を大きく・近くしたことが効いている。エラー率差は僅かに有意（p=0.087）で、中央付近の項目はどちらの形式でも誤選択が増える傾向。
- **破綻・批判点**: 項目数が多い（8を超える）と隣接ウェッジが狭くなり優位性が消える。中心付近の選択はどの方式でも精度が落ちる。
- 出典: [The Design and Implementation of Pie Menus](https://donhopkins.medium.com/the-design-and-implementation-of-pie-menus-80db1e1b5293), [An Empirical Comparison of Pie vs. Linear Menus](https://donhopkins.medium.com/an-empirical-comparison-of-pie-vs-linear-menus-466c6fdbba4b), [Pie Menus: A 30 Year Retrospective](https://donhopkins.medium.com/pie-menus-936fed383ff1)

### 1-2. マーキングメニュー（Marking Menus） — Kurtenbach & Buxton, 1991-93／Maya・Blenderで現役
- **仕組み**: パイメニューをポップアップさせずに、方向だけを覚えていれば画面を見ずに一筆書きのマーク（ストローク）で選択できる。ポップアップ版とマーク版は同じジェスチャーの延長線上にある。
- **削った操作コスト**: 「メニューが出るのを待つ」「視認して選ぶ」という2段階を、熟練後は「見ずに1ストローク」に圧縮する。
- **なぜ効くか**: 選択するたびに同じ手の動きを練習することになるため、身体が方向を記憶する（muscle memory）。「記号のラベルを忘れても方向の記憶は残る」という研究知見があり、初心者から熟練者への移行が自然に起きる設計。8項目のパイメニューでは熟練者は複数項目を先読みして連続マーク（mark-ahead）できるが、リニアメニューでは2項目先読みが限界。
- **破綻・批判点**: Kurtenbach & Buxton (1993) "The limits of expert performance using hierarchic marking menus" は、階層を深くしすぎると熟練者でも性能が頭打ちになることを示した（無限に速くはならない）。
- 出典: [The limits of expert performance using hierarchic marking menus](https://www.billbuxton.com/MMExpert.html), [THE DESIGN AND EVALUATION OF MARKING MENUS](https://www.research.autodesk.com/app/uploads/2023/03/the-design-and-evaluation.pdf_recHpUp1v9dc1n2CJ.pdf), Maya/Blenderのホットボックス実装（[Autodesk Maya Help](https://help.autodesk.com/view/MAYAUL/2022/ENU/?guid=GUID-751407E4-7728-463F-9806-954AC3B72279)）

### 1-3. GTA ウェポンホイール — Rockstar, 2009 (Chinatown Wars) 〜／現役（GTA VI含め継続採用）
- **仕組み**: ボタン長押しで8スロットの円環武器選択が出現し、**同時にゲーム内時間がスローモーションになる**。
- **削った操作コスト**: 「武器を順送りでスクロールする」操作（誤操作・時間ロス）を排除し、方向入力一発で武器種にジャンプできるようにした。
- **なぜ効くか**: スロー化によって「メニューを開いている間も世界が止まらない（diegeticに近い）」体験を保ちつつ、実際は操作の誤差を許容する時間を稼いでいる。方向依存のFitts的優位はパイメニューと同じ。
- **破綻・批判点**: スロー化はアクション性を殺すとの批判もあり、DUSKなど後発インディーはあえて弾切れ中の武器チェンジにのみバレットタイムを効かせるなど設計を調整している。
- 出典: [Weapon Wheel | GTA Wiki](https://gta.fandom.com/wiki/Weapon_Wheel), [The art of designing visceral and engaging Bullet Time gunplay](https://www.gamedeveloper.com/design/the-art-of-designing-visceral-and-engaging-bullet-time-gunplay)

### 1-4. Secret of Mana「リングコマンド」 — Square, 1993／現役ではないがリバイバル(2018リメイク)で継続
- **仕組み**: アクションRPGの戦闘中、リング状のアイコンメニューをその場に呼び出し、フォーカスした項目の説明だけを画面上部に一行表示。
- **削った操作コスト**: 従来のテキストベースコマンドメニュー（迷路のような入れ子テキスト）を排除し、戦闘のリアルタイム性を止めずに済むようにした。
- **なぜ効くか**: 情報を「今フォーカスしている1項目分だけ」出す設計により、画面占有と読解コストを最小化。
- **破綻・批判点**: 同系統の Temple of the Elemental Evil (2003) は階層を同心円で表現したが、3階層を超えると円が画面を占有しすぎ、テキストが回転して読みにくくなり批判された（＝パイ/リング型は階層を深くすると破綻する典型例）。
- 出典: [RADIAL MENUS IN VIDEO GAMES – The Picky Champy](https://champicky.com/2022/01/21/radial-menus-in-video-games/)

### 1-5. Photoshop ブラシHUD — Adobe／現役
- **仕組み**: Mac は Ctrl+Option+クリックしたままドラッグ、Win は Alt+右クリックしたままドラッグで、ブラシのプレビュー円とサイズ・硬さのHUDが出る。左右ドラッグ＝サイズ、上下ドラッグ＝硬さと、**1本の連続ジェスチャーで2軸パラメータを同時操作**する。
- **削った操作コスト**: サイズと硬さをそれぞれ別スライダー/別ショートカット（`[` `]` と `Shift+[` `Shift+]`）で往復する手間を、1ジェスチャーに統合。
- **なぜ効くか**: モーダルなポップアップUIを介さず、ポインタの相対移動量だけで完結する＝視線を画面のUI部品に移す必要がない（キャンバスを見たままでいい）。
- **破綻・批判点**: ショートカットの存在に気づきにくい（発見可能性が低い）。習得コストは前提になる。
- 出典: [HUD Brush Controls in Photoshop – Ask Tim Grey](https://asktimgrey.com/2023/09/08/hud-brush-controls-in-photoshop/), [Adobe Community](https://community.adobe.com/t5/photoshop/brush-size-hardness-hud-shortcut-mac-ms-surface-device/td-p/9555636)

### 1-6. Dead Space の Diegetic UI（背中のHPバー） — Visceral Games / EA, 2008／シリーズとしては非稼働だがデザイン思想は継続引用
- **仕組み**: 主人公アイザックのスーツの背中に発光バーがあり、ダメージを受けると緑→赤に減っていく。画面に体力バーのオーバーレイは一切ない。スキューバダイバーのスーツ背面ディスプレイから着想。
- **削った操作コスト**: 「HUDを見る」という視線移動そのものを消した。プレイヤーはキャラクターの体を見ることで状態を把握する。
- **なぜ効くか**: 恐怖演出（サバイバルホラー）と情報取得を同一視線内に統合し、画面の没入感を切らさない。「UIをUIに見せない」ことで緊張感が持続する。
- **破綻・批判点**: 高速な判断が必要な状況（多数の敵に囲まれた時など）では、背中を確認する動作自体が視認性のボトルネックになりうる。ジャンル・文脈依存の手法で、常時参照が必要な情報には不向き。
- 出典: [Dead Space: The UI art that disappears in the game world](https://medium.com/@lorenzoardeni/dead-space-the-ui-art-that-disappears-in-the-game-world-289718133c29), [Video: Designing Dead Space's immersive user interface](https://www.gamedeveloper.com/design/video-designing-i-dead-space-i-s-immersive-user-interface)

### 1-7. Apple Watch Digital Crown + Taptic Engine — Apple, 2015〜（ハプティクス版はSeries 4, 2018〜）／現役
- **仕組み**: 物理的に回転するクラウンでスクロール。Series 4以降は回転量に応じてTaptic Engineが**機械的デテント（クリック感）を持たない部品なのに、疑似的にクリック感を生成**する。
- **削った操作コスト**: 小さい画面上でのピンチ/スワイプに頼らず、片手の親指ひとつの回転操作でリスト送りができる（視線を画面に固定しなくても操作の区切りが指に伝わる）。
- **なぜ効くか**: 触覚が「今何個分動いたか」を明示するため、視覚確認なしでも操作の確信度が上がる（後述の「触覚が確信を作る」原理）。
- **破綻・批判点**: ソフトウェア的に生成されたデテントは、本物の機械的クリックに比べ強度が一定で、回転速度に応じた自然な抵抗変化までは再現できないとの指摘がある。
- 出典: [Apple Watch Series 4: A big leap for the Digital Crown](https://9to5mac.com/2018/10/04/apple-watch-series-4-digital-crown-evolution-review/), [How to turn off the Digital Crown haptic feedback](https://www.idownloadblog.com/2018/10/02/turn-off-digital-crown-haptic-feedback-apple-watch/)

### 1-8. iPod クリックホイール — Apple, 2001（物理）→2002（タッチ式）／2014年以降のiPod系列縮小で実質終了だが操作思想は現役
- **仕組み**: 指でホイールをなぞると、なぞる速度に応じて**非線形に加速**するスクロールが起きる（ソフトウェアの加速度モジュールが物理的な指の動きをリスト送り量に変換）。
- **削った操作コスト**: 数千曲のリストを「1曲ずつの線形スクロール」で辿るコストをなくし、速く回せば速く進む・ゆっくり回せば精密に選べる、という単一ジェスチャーで粗い移動と精密な移動を両立させた。
- **なぜ効くか**: 加速度カーブのチューニングが「意図通りの速さで動いている」感覚を作り、リストの長さに関わらず操作感が一定に保たれる。
- **破綻・批判点**: タッチ式（無可動部）は物理エンコーダに比べ触覚フィードバックが弱く、慣れるまで意図せぬ暴走スクロールが起きやすかった。
- 出典: [IPod click wheel - Wikipedia](https://en.wikipedia.org/wiki/IPod_click_wheel), [The Secret Behind the iPod Scroll Wheel](https://hardware.slashdot.org/story/04/09/21/1332236/the-secret-behind-the-ipod-scroll-wheel)

### 1-9. Tinder スワイプカード — Tinder, 2012〜／現役
- **仕組み**: カード1枚＝プロフィール1件。右スワイプ＝好意、左スワイプ＝却下という1ジェスチャー1判定。2013年出願・特許化（意匠特許 D798,314ほか）。
- **削った操作コスト**: 「詳細を開く→ボタンを押す→戻る」という複数ステップを、1本指のドラッグ＋離す、に圧縮。
- **なぜ効くか**: ジェスチャーの方向が判定の意味と一対一対応しており、学習コストがほぼゼロ。Bumbleとの特許訴訟でも「既存UIを十分に改善した」とSection 101の下で争う価値ありと認められた。
- **破綻・批判点**: 誤スワイプの取り消し導線が必要になる（Tinderは「巻き戻し」を課金機能として提供）。二値判定に単純化しすぎて中間評価ができない。
- 出典: [Tinder's Swiping and Matching Model was Patented in 2013](https://www.globaldatinginsights.com/news/tinders-swiping-matching-model-patented-2013/), [Courts Will Swipe Left On Tinder's Suit Against Bumble](https://patentprogress.org/2018/03/courts-will-swipe-left-on-tinders-suit-against-bumble/)

### 1-10. Anki の4段階評価ボタン（Again/Hard/Good/Easy） — 2006〜／現役
- **仕組み**: 解答を見た後、4つの固定位置ボタンで理解度を申告し、間隔反復アルゴリズム（SM-2改）が次回出題日を決める。
- **削った操作コスト**: 「間隔をどう設定するか」という判断をユーザーから完全に奪い、4値の主観評価だけに絞った。
- **なぜ効くか**: 実測データ（Anki利用者の行動ログ分析）では、ユーザーの39.8%が「Againに一番時間をかけ、Easyに一番時間をかけない」という直感的なパターンを示す＝評価そのものが判断コストの低い操作になっている。
- **破綻・批判点**: 4ボタンの意味（特にHardとGoodの境界）を誤解しているユーザーが多いという指摘があり、シンプルな4分割が万人にとって直感的とは限らない。
- 出典: [Button usage and review time of Anki users](https://expertium.github.io/Buttons.html), [What spaced repetition algorithm does Anki use?](https://faqs.ankiweb.net/what-spaced-repetition-algorithm)

### 1-11. Superhuman「100msルール」とキーボード駆動設計 — 2017〜／現役
- **仕組み**: Gmail開発者Paul Buchheitの「100ms以内の反応は"瞬時"に感じる」という原則を全操作に適用し、100以上のキーボードショートカットでマウスを排除。
- **削った操作コスト**: 「マウスに持ち替える」動作そのもの。Superhuman側の主張では**マウス操作1回につき2〜4秒のオーバーヘッド**が発生するとされ、キーボードのみの操作で受信トレイ処理を2倍速にしたと謳う。
- **なぜ効くか**: 同じキーが常に同じ意味を持つ一貫性（J/K=移動、E=アーカイブ等）により、判断コストではなく反射で操作できる状態を作る。
- **破綻・批判点**: ショートカットの暗記コストが初期学習の壁になる（オンボーディングに人力コーチングを付けていた時期がある、というのがSuperhumanの初期の物議を醸した点）。
- 出典: [Why Superhuman Mail is built for speed](https://blog.superhuman.com/superhuman-is-built-for-speed/), [Speed Up With Shortcuts](https://help.superhuman.com/hc/en-us/articles/45191759067411-Speed-Up-With-Shortcuts)

### 1-12. Nest Learning Thermostat の物理ダイヤル — Nest/Google, 2011〜／現役
- **仕組み**: ボタンではなく1つの回転ダイヤルのみで温度調整するインターフェース。「99.9%の操作は上げ下げだけ」という前提から設計。
- **削った操作コスト**: メニュー階層・ボタン選択を排除し、単一の連続量操作（回す）に集約。
- **なぜ効くか**: 現実のサーモスタットの身体記憶（つまみを回す）をそのまま踏襲し、学習コストをほぼゼロにした。
- **破綻・批判点**: 微調整（1度単位）と大幅調整を同じ回転速度でこなすには限界があり、後継機では回転量とタッチの併用に調整されている。
- 出典: [Talking Design With the Creative Director Behind the New Nest](https://design-milk.com/talking-design-with-the-creative-director-behind-the-stunning-new-nest-thermostat/)

---

## 2. 抽出できる原理

1. **等距離・大標的化でFittsコストを潰す**: 中心から等距離に選択肢を配置し標的を大きく取ると、位置によらず到達時間が均一化する（パイメニュー実測+15%、標的面積2〜3倍）。項目数が増える・階層が深くなると効果は反転して破綻する（Temple of Elemental Evilの同心円批判）。
2. **反復ジェスチャー→筋肉記憶への自然遷移**: 同じ入力を繰り返す設計は、初心者の「見て選ぶ」を熟練者の「見ずに選ぶ」へシームレスに移行させる（マーキングメニュー、格ゲー入力、Vimのoperator+motion）。ただし十分な反復頻度がないと記憶は定着しない。
3. **入力の意味を固定し、モード切替をなくす**: 同じボタン・同じ方向が常に同じ意味を持つことで判断コストをゼロにする（ゲームパッドの意味の固定、Ankiの4ボタン固定位置、Superhumanの一貫ショートカット）。
4. **物理メタファーの疑似再現が学習コストを消す**: 実世界の摩擦・慣性・クリック感をソフトウェアに移植すると、ユーザーは新しい操作を覚え直さずに済む（iPodの加速度カーブ、Digital Crownの疑似デテント、Nestの回転ダイヤル）。
5. **UIを隠しても情報は伝わる（diegetic化）**: 視線を専用UIパーツに移動させるコストそのものを消せる場面では、情報をゲーム世界/操作対象自体に埋め込む方が速い（Dead Spaceの背中HPバー）。ただし常時参照・高速判断が必要な情報には不向き。
6. **触覚・音・アニメーションは待ち時間を隠し「確信」を作る**: 判定や完了の瞬間に短い触覚/音を添えると、画面を見ていなくても「今の操作は成立した」という確信が生まれ、次の操作へ素早く移れる（Digital Crownのデテント、Duolingoの完了演出、Anki/Superhumanの高速処理感）。

---

## 3. muninnへの適用案（5つ・ボツになりうる理由つき）

前提: 読み専用・片手（親指）操作・PWA・ダーク固定・「再読カード」を高速にさばくのが心臓部。

### 案A: 画面下半分を左右2ゾーンに分けた「タップだけ判定」
問いを見て→タップでめくる→**そのままもう一度、画面左タップ＝あやしい／右タップ＝わかった**、とドラッグ量に依存しないボタンレス判定にする。親指の可動域内に収まり、Tinder的な「ジェスチャーの方向＝意味」を保ちつつ、誤スワイプによる意図しない判定を防ぐ。
- **ボツ理由**: Ankiの4段階評価がSM-2の精度を支えている実測があり、2値化すると間隔反復のスケジューリング精度が落ちる可能性がある。muninnの`srs`はSM-2簡易版なので、2値→間隔の変換ロジックを別途設計しないと本末転倒になる。

### 案B: 「見る→めくる→判定」を1本指の縦スワイプ連鎖にする
上スワイプでめくる（答え表示）→そのまま上/下スワイプで判定、という**1本指を離さない連続ジェスチャー**にまとめ、「今どのモードか」を意識させない。

- **ボツ理由**: iOS SafariにはVibration APIが存在せず、確認できた唯一の代替は iOS 18+ の `<input type="checkbox" switch">` ハック。これは**ユーザーの明示的なクリック操作（activation）に紐づく必要があり、スクリプトだけでは発火できない**とWebKit側で制約されている（未確認: スワイプのpointerup自体がuser activationとして扱われるか）。iOS 17以下やAndroid Chromeでは挙動が割れ、体験が一貫しない。

### 案C: 長押しで出す半円クイックアクション（パイメニューの片手版）
カード上を長押しすると、親指の自然な可動域（下から扇形）にタグ編集・関連ノートへジャンプ・「Claudeに依頼」等をパイメニュー状に展開する。

- **ボツ理由**: パイメニュー/マーキングメニューの優位性は「同じ位置に同じ項目がある状態を繰り返し使う」ことで筋肉記憶が育つ点にある。muninnは1日数分・低頻度の利用であり、Maya/格ゲーほどの反復回数が確保できず、覚える前に忘れる可能性が高い。

### 案D: クリックホイール的な加速度スクロールで「棚（在庫俯瞰）」を速く回す
②在庫俯瞰タブのリストスクロールを、ドラッグ速度に応じて非線形加速するiPod的スクロールにし、大量のノートを1本指で素早く行き来できるようにする。

- **ボツ理由**: iOS Safariのネイティブなmomentum scrollingを上書きしてカスタム加速度カーブを実装するのは、`touch-action`やスクロールジャンクの問題を抱えやすく、既存の信頼できるネイティブスクロールを捨てるコストに見合わない可能性が高い。

### 案E: 判定のたびに触覚リズムを変えて「確信」を作る
わかった＝短いタップ1回、あやしい＝短いタップ2回、というように判定結果ごとに異なる触覚リズムを鳴らし、画面を見ずに連続判定できるようにする（Digital Crownのデテント、Superhumanの反射的操作の思想）。

- **ボツ理由**: 確認できた唯一のiOS Safari向け代替手段（checkbox switchハック）は「単発のクリック感」しか出せず、CHHapticEngineのような複雑なパターン/リズムの作り分けはネイティブアプリでないと不可能（未確認: 複数の`<input>`を連続で切り替えてリズムを模倣できるかは要実機検証）。PWAという制約下では「リズムで区別する」設計は絵に描いた餅になりやすい。

---

## 4. Web(PWA)で再現する際の技術的な勘所

- **Pointer Events**: `pointerdown`→`pointermove`→`pointerup`で統一し、`touch`/`mouse`個別ハンドリングを避ける。ドラッグ中は`element.setPointerCapture(pointerId)`でポインタが要素外に出ても追跡を継続する。`touch-action: none`をジェスチャー対象要素に指定しないと、ブラウザの標準スクロール/ズームとジェスチャーが競合する。
- **タッチの慣性（momentum）**: ネイティブの`overflow: scroll`に任せる場合は`-webkit-overflow-scrolling: touch`（Safariの慣性）に依存できるが、カスタム加速度カーブを実装する場合は`pointermove`の時間差分から速度を算出し、`requestAnimationFrame`ループで減衰を手動計算する必要がある（ネイティブスクロールとの二重発火に注意）。
- **iOS Safari で Vibration API が使えない問題**: `navigator.vibrate()`はSafari（macOS/iOS）で一度も実装されておらず、2025〜2026時点でも未対応が確認できる。唯一確認できた代替は、iOS 18以降のWebKitが`<input type="checkbox" switch">`のトグルに対してネイティブな触覚（Settingsアプリのスイッチと同じ感触）を発火するようになった仕様を利用するハック（`web-haptics`等のOSSが採用）。ただし①**ユーザーの明示的な操作（クリック）に起因する必要があり、任意のタイミングでスクリプトから単独発火できるかは要検証**、②iOS 18未満・Android Chrome（`navigator.vibrate`が使える）とで実装を分岐させる必要がある、③複雑なパターン（連続リズム）は再現できない。本番導入前に実機（複数iOSバージョン）での検証が必須。
- **CSS transform でのラジアル配置**: 各項目の角度は`--i`（インデックス）と`--n`（総数）をCSS変数に渡し、`transform: rotate(calc(360deg / var(--n) * var(--i))) translate(var(--radius)) rotate(calc(360deg / var(--n) * var(--i) * -1))`のように二重回転で「配置だけ回して中身は正立させる」のが定石。`conic-gradient()`を背景に使う場合、色相境界の更新はCSSカスタムプロパティの書き換えだけで完結させると**GPUが担当するリペイントで約1ms**、JS文字列でグラデーション定義を再生成すると**5〜10ms**かかるとの報告があり、ドラッグ中の追従表示ではカスタムプロパティ更新一択。
- **60fpsを保つ実装**: アニメーションは`transform`と`opacity`のみに限定し、`width`/`height`/`top`/`left`など再レイアウトを伴うプロパティは避ける。頻繁に動く要素には`will-change: transform`を付与するが、常時全要素に付けるとメモリ消費が増えるため対象を絞る。`pointermove`のリスナーは`{ passive: true }`にできる場合は付け、`preventDefault()`が必要な場面（ジェスチャー中のスクロール抑制）だけ`passive: false`にする。DOM更新はイベントハンドラ内で直接行わず`requestAnimationFrame`でバッチする。

---

## 未確認・要検証事項まとめ
- iOS Safariの`checkbox switch`ハプティクスハックが、スワイプ完了などスクリプト起点のタイミングで確実に発火するか（user activationの扱い）
- 同ハックで複数回の切り替えを高速に行った際、リズムパターンとして知覚できるか（実機検証が必要）
- Android Pie Control（Chainfireとの関連）は情報源で確証が得られず、本レポートでは採用を見送った
