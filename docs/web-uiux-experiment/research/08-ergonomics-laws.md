# 人間工学・認知の法則と実証データ — muninn 閲覧サイト刷新案の採点用リサーチ

対象: A案（マーキングメニュー方式）／B案（入力欄1つ主役・NV方式）／C案（横めくりページング）＋共通機能（2択想起判定・リンクのプレビュー）を、人間工学・認知科学の一次情報で採点するための物差し。

---

## 1. 法則・研究・ガイドライン一覧（各: 主張／実測値／モバイル適用時の注意／批判・限界）

### 1-1. Fitts's Law（フィッツの法則）
- **主張**: 移動時間 MT = a + b·log2(A/W + 1)（Shannon formulation）。ターゲットが小さく／遠いほど到達時間が伸びる。
- **実測**: タッチ向け拡張版「FFitts law」が指の接触あいまいさ（finger ambiguity）を組み込んでモデル化（Bi, Li, Zhai）。モデルの説明力はマウスより高い分散を示す。
- **モバイル適用の注意**: デスクトップ／マウスでは「画面端・角は無限の幅を持つ」（ポインタが物理的に画面外に出られず止まるため、オーバーシュートしない＝到達コストが激減）。**これはタッチでは成立しない**。指は画面端で物理的に止まらないため、端に置いたターゲットは誤タップ・タップ漏れが起きやすい（codinghorror「Fitts' Law and Infinite Width」、NN/g「Fitts's Law and Its Applications in UX」で明記）。macOSのメニューバーが画面最上端にあるのはこの「無限幅」を利用した設計だが、タッチUIでこの発想をそのまま輸入すると根拠が崩れる。
- **批判・限界**: 小さいタッチ標的では予測精度自体が下がる（=フィッツの法則の説明力が落ちる）という報告がある。

出典: [FFitts Law: Modeling Finger Touch with Fitts' Law](https://www3.cs.stonybrook.edu/~xiaojun/pdf/FFitts.pdf) / [Fitts' Law and Infinite Width](https://blog.codinghorror.com/fitts-law-and-infinite-width/) / [NN/G: Fitts's Law](https://www.nngroup.com/articles/fitts-law/)

### 1-2. Steering Law（Accot–Zhai, 1997）
- **主張**: T = a + b(A/W)。パス（トンネル）を辿る操作のコストは長さAと幅Wの比に線形。狭く長いトンネルほど時間がかかる。フィッツの法則を積分により一般化した式で、1997年に実験的に検証。
- **実測**: NN/gの整理では、スライダーのつまみは最低1cm×1cm相当を推奨。トンネルが狭い・長いほどエラー率と所要時間が増える。
- **モバイル適用の注意**: ドラッグでメニューを辿る操作（マーキングメニュー、方向ドラッグナビゲーション）は本質的に「原点からの角度／距離をトレースする」操作であり、Steering Lawが直接効く。分岐（トンネルの本数）が増える・角度差が狭くなるほど誤操作が増える。
- **批判・限界**: NN/gの記事自体はmarking menuの直接評価を含まない（対象はスライダー・階層メニュー中心）。marking menu特有の学習曲線は次項の一次研究で補う必要がある。

出典: [NN/G: Accot-Zhai Steering Law](https://www.nngroup.com/articles/steering-law/) / [Steering law - Wikipedia](https://en.wikipedia.org/wiki/Steering_law)

### 1-3. Marking Menu研究（Kurtenbach & Buxton, CHI 1993/1994）
- **主張**: 初心者はメニューをポップアップさせて選ぶが、熟達者はメニュー表示を待たずにマーク（ストローク）だけで選択できるようになる。ただし移行は一方向ではなく、熟達者でも記憶があやふやな時はメニュー表示に戻って確認する。
- **実測**: パイメニュー（放射メニュー）は6〜8分割で精度・効率が最大化されるとされる（USPTO特許文献にも引用される定説）。階層化した marking menu では熟達しても選択に上限的な時間・エラー率が残る（"The limits of expert performance using hierarchic marking menus", Kurtenbach & Buxton 1993）。
- **モバイル適用の注意**: A案「方向ドラッグで全ナビゲーション」はまさにこの marking menu の一種。1階層あたりの分岐数が8を超えると精度が急落する。階層を深くする（原点から複数段階の方向指定をさせる）と、熟達者でも性能が頭打ちになることが実証されている。
- **批判・限界**: 元研究はマウス／スタイラス操作、デスクトップ・タブレット環境（CADソフト等）が対象。片手スマホ・指操作での追試は限定的で、素直に外挿できるかは不確か（**未確認**扱いが妥当）。

出典: [User Learning and Performance with Marking Menus](https://www.billbuxton.com/MMUserLearn.html) / [The limits of expert performance using hierarchic marking menus](https://www.billbuxton.com/MMExpert.html) / [設計評価原論文PDF](https://www.research.autodesk.com/app/uploads/2023/03/the-design-and-evaluation.pdf_recHpUp1v9dc1n2CJ.pdf)

### 1-4. 親指可動域研究（Steven Hoober, 2013 UXmatters／2017年の自己修正）
- **主張**: 1,333人のスマホユーザーを空港・バス・駅などで自然観察。**49%が片手＋片親指**、**36%が両手保持＋片親指操作**、**15%が両手両親指**。**タッチ操作の75%は親指で行われる**。画面下部中央〜利き手側が「Greenゾーン（無理なく届く）」、画面中〜側面が「Yellow（伸ばせば届く）」、画面上部の角が「Red（持ち替えが必要）」という3色モデルを提示。
- **モバイル適用の注意（重要）**: **Hoober自身が2017年に3部作の続報を出し、「2013年の図が“固定ルール”として誤用されている」と明確に警告した**。画面大型化後の観察では、ユーザーは画面中央をより多く見て触る傾向があり、単純な「下端＝安全、上端＝危険」という固定ゾーン解釈を戒めている。また、握り方はタスク・文脈で頻繁に切り替わる。
- **批判・限界**: 原研究は2013年、iPhone 5世代（画面4インチ前後）のデータであり、現行6インチ超級端末にそのまま適用するのは著者本人が否定している。「画面端は常に赤ゾーン」という単純化は誤り。ただし「操作の主体は親指」「片手保持が過半数」という大枠の知見自体は繰り返し確認されており否定されていない。

出典: [How Do Users Really Hold Mobile Devices? (UXmatters, 2013)](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)

### 1-5. タッチターゲットサイズ（Apple HIG 44pt／Material 48dp／一次研究 Parhi・Karlson・Bederson 2006）
- **主張**: Apple HIGは最小タップ領域として**44×44pt**を、Material Designは**48×48dp（物理約9mm、推奨7〜10mm幅）**を一貫して推奨。
- **一次研究**: Parhi, Karlson, Bederson, "Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices" (MobileHCI 2006)。片手・親指操作限定でのターゲットサイズを実測した最初期の研究で、単発タップ（discrete）と連続タップ（serial／文字入力等）両方を検証。**MobileHCI 2016でBest Historical Paper Award**を受賞するほど業界標準（44pt/48dp系ガイドライン）の背骨になっている。
- **モバイル適用の注意**: 44pt/48dpは主に「単発の孤立したターゲット」を前提にした数字。密集した複数ターゲット（誤タップ率）の議論は次項Holz & Baudischの方が精緻。
- **批判・限界**: Apple公式HIGページ自体はJavaScriptレンダリングのため一次情報を直接確認できなかった（**44ptの数値は複数の二次情報源で一致して確認、公式ページの直接引用は未達成として明記**）。

出典: [Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices (Microsoft Research)](https://www.microsoft.com/en-us/research/publication/target-size-study-for-one-handed-thumb-use-on-small-touchscreen-devices/) / [PDF原文](https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf) / [Material Design Touch Target](https://m2.material.io/develop/web/supporting/touch-target)

### 1-6. Holz & Baudisch, "Understanding Touch" (CHI 2011)
- **主張**: タッチデバイスは接触面積の中心を入力点とみなすが、ユーザーは指の爪側の一点を基準にターゲットを狙っており、両者にズレ（offset）が生じる。
- **実測**: 従来の「接触面積の中心」モデルでは誤差offsetが約**4mm**。著者らが提案する"projected center model"では誤差が**1.6mm**まで改善（＝約2.5倍の精度向上）。
- **モバイル適用の注意**: 密に並んだ小さいターゲット（例: A案の方向ドラッグ判定境界、C案のページ送り微調整域）では、このオフセットが誤操作の主要因になりうる。
- **批判・限界**: 実験室環境での精密計測が中心。歩行中・画面保護フィルム装着時など実運用条件での外的妥当性は本論文の主眼ではない。

出典: [Understanding Touch (原論文PDF)](https://www.christianholz.net/2011-chi11-holz-baudisch-understanding_touch.pdf) / [著者による解説](https://www.christianholz.net/understanding_touch.html)

### 1-7. Norman & Nielsen, "Gestural Interfaces: A Step Backwards In Usability" (*Interactions* vol.17 no.5, 2010)
- **主張**: ジェスチャUIはGUI最大の利点だった「メニューを見て機能を発見できる」性質を失う。
  > "how is anyone to know, first, that this magical gesture exists"（このジェスチャの存在すら、どうやって知ればいいのか）
  標準化の欠如も指摘:
  > "anything you can show and touch can be a UI on this device. There are no standards"
  事故的発動のリスク:
  > "Accidental activation is common in gestural interfaces"
- **モバイル適用の注意**: A案（方向ドラッグが全ナビゲーションの唯一の入口）はこの批判の直撃対象。B/C案もジェスチャ主体部分（横めくり、長押しプレビュー）は同じ弱点を持つ。
- **批判・限界**: 実証研究論文ではなく2010年の論説（opinion piece）。ただしHCI業界で最頻出級に引用される一次資料であり、その後もジェスチャの発見可能性問題そのものが技術的に解消したという反証は見当たらない（オンボーディングやハプティクスでの緩和策はあるが、問題の根は残る）。

出典: [Gestural Interfaces: A Step Backwards In Usability (jnd.org, Don Norman本人サイト)](https://jnd.org/gestural-interfaces-a-step-backwards-in-usability/)

### 1-8. Hick's Law（Hick–Hyman Law）と選択肢数
- **主張**: 反応時間 RT = a + b·log2(n+1)。選択肢数の対数に比例して意思決定時間が増える。
- **実測**: 放射（パイ）メニューは**6〜8分割**が精度・効率のピークとされる（USPTO 9383897等）。一般的なメニュー設計の目安は複雑な判断で5〜9項目、時間制約が強い操作は3〜5項目。
- **モバイル適用の注意**: A案の8方向ドラッグはこの経験則の上限ギリギリ。B案・共通機能の「2択判定」はHick's lawが意味する**理論上最速の意思決定形態**（n=2）。
- **批判・限界**: Hick's lawは「均等に予測可能・既知の選択肢」を前提にした実験室研究であり、実UIでの視覚探索コスト（Fitts的要素）や項目が未知か既知か（recognition/recallの差）を無視しがち。単純に項目数だけで時間を予測するのは危険。

出典: [Hick's Law: Designing Long Menu Lists (NN/G)](https://www.nngroup.com/videos/hicks-law-long-menus/) / [放射メニュー特許文書](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9383897)

### 1-9. Miller "The Magical Number Seven" (1956) とCowan (2001) による修正
- **主張**: Miller (Psychological Review, 1956) は短期記憶容量を「7±2チャンク」としたが、**本人が後年「7」は修辞的装置に過ぎないと繰り返し釈明**している。Cowan (2001) の広範なレビューでは、注意の焦点容量は**約4チャンク**が妥当と結論。
- **モバイル適用の注意**: マーキングメニューで「原点から何方向を無意識に覚えられるか」を設計するなら、安全圏は4方向程度（Cowanの数字）で、8方向は記憶の限界に近い。
- **批判・限界**: 「7±2」はデザイン業界で最も誤用される数字の一つ。UI項目数の絶対的上限根拠として引用するのは学術的に不適切（Edward Tufteも「デザインに無関係」と明言）。

出典: [The Magical Number Seven, Plus or Minus Two (Wikipedia経由・原文リンクあり)](https://en.wikipedia.org/wiki/The_Magical_Number_Seven,_Plus_or_Minus_Two) / [原論文PDF](https://labs.la.utexas.edu/gilden/files/2016/04/MagicNumberSeven-Miller1956.pdf) / [Tufte: Not relevant for design](https://www.edwardtufte.com/notebook/the-magical-number-seven-plus-or-minus-two-not-relevant-for-design/)

### 1-10. Jef Raskin, モードエラー論とquasimode（『The Humane Interface』2000）
- **主張**: モード切替はユーザーが「今どのモードか」を忘れることで誤操作（mode error）を招く元凶。quasimode（Shiftキーのように、物理的に押し続けている間だけ有効なモード）はキネステティックな維持により、モードを忘れることが構造的に起きない。
- **モバイル適用の注意**: B案の「入力欄が空欄=今日の面／何か打つ=横断絞り込み／ゼロヒット=Claude依頼」は**テキストの有無という不可視に近い差分だけで意味が変わる暗黙モード**。C案の「縦スクロール軸／横めくり軸」の切替も本文内で発生するモードだが、こちらはRaskinの言う「軸が異なる＝混同しにくい」設計に近い。
- **批判・限界**: Raskinの主張は理論的考察と経験的観察が中心で、モードエラー率を統制実験で定量測定した研究ではない（下敷きにはNormanのslip研究がある）。

出典: [Mode (user interface) - Wikipedia](https://en.wikipedia.org/wiki/Quasimode_(computer_interface)) / [The Humane Interface 要約 (RaskinCenter.org)](https://raskincenter.org/jef/humane-interface/)

### 1-11. WCAG 2.2 達成基準 2.5.8 Target Size (Minimum)（Level AA）
- **主張**: ポインタ入力のターゲットは**最低24×24 CSSピクセル**（Level AA、法定要件になりうる: ADA/Section 508/EAA対象）。5つの例外あり: (1) Spacing—24px未満でも各ターゲット中心の24px径の円が他と重ならない配置、(2) Equivalent—同機能の代替コントロールが基準を満たす、(3) Inline—文中リンク等、(4) User Agent Control—未修正のブラウザ既定要素、(5) Essential—地図のピン等、情報伝達上サイズが本質的な場合。
- **根拠**: 関連資料として、片手親指操作の実測研究（=1-5のParhi・Karlson・Bederson系）を参照。
- **モバイル適用の注意**: A案の操作原点、B案の入力欄内操作子、C案のページ送りインジケータなど、**すべてこの24×24pxが絶対的な最低ライン**（Apple 44pt/Material 48dpはこの上位互換）。
- **批判・限界**: 24pxは「これ以下は違反」という下限であり、快適な操作性を保証する数字ではない（Apple/Materialの数字の方が実用的な目安）。

出典: [Understanding SC 2.5.8 (W3C公式)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

### 1-12. 横めくり・ページング vs 連続スクロールの読書効率（結果は割れている＝要注意）
- **Dyson & Kipping (1998)**: ページング条件は読む速度がスクロールより速いが、理解度に有意差なし。
- **一方でChaparro & Baker (Usability News掲載研究)**: 別条件ではページング条件がスクロール条件より**有意に時間がかかった**という、Dysonと逆方向の結果を報告。
- **Harvey & Walker (2018, *Quarterly Journal of Experimental Psychology*)**: 横に流れる（scroll）テキストは文字通りの理解（literal comprehension）は概ね維持されるが、**推論を要する設問の正答率が有意に低下**し、ワーキングメモリ容量が低い被験者ほど悪影響が大きい。
- **モバイル適用の注意**: C案の「新聞紙面メタファ＝ページ単位の横めくり」に**直接一致する実証研究は見つからず、結果自体も研究間で逆転している**。「めくる方が速い／理解度は同等」と単純に主張することはできない。Harvey & Walkerの知見は「横スクロールする流れるテキスト」の話でありC案の「静止ページを横に切り替える」形式とは条件が異なるため、そのまま外挿するのは危険。
- **結論**: **未確認**（C案の横めくりが縦スクロールより優れている、または劣っているという確定的な実証データはない）。

出典: [The Impact of Paging vs. Scrolling on Reading Online Text Passages](http://www.usabilitynews.org/misc/the-impact-of-paging-vs-scrolling-on-reading-online-text-passages/) / [Reading comprehension and horizontally scrolling text (Harvey & Walker, SAGE)](https://journals.sagepub.com/doi/10.1080/17470218.2017.1363258)

### 1-13. アクセシビリティ複合項目
- **VoiceOverとジェスチャの衝突**: カスタムのタッチ・ジェスチャ認識はVoiceOverの標準ジェスチャ（1本指スワイプでフォーカス送り等）を握りつぶす／衝突することが多数報告されている。対処法として「カスタムジェスチャがAT稼働中であることを検知して代替ボタンを出す」「accessibility actionsとして代替導線を必ず用意する」が推奨される。
- **prefers-reduced-motion**: パララックスや大きなパン・スケールアニメーションは前庭障害（めまい・偏頭痛の誘因）になりうる。CSS `prefers-reduced-motion` メディアクエリで低減提供が標準的対策（MDN, web.dev）。
- **コントラスト比**: WCAGは通常テキストで**4.5:1**、大きな文字（24px以上、または太字19px以上）で**3:1**を要求。ダークモードは万能ではなく、明所での瞳孔拡張によりむしろ低コントラストが読みにくくなる報告や、乱視ユーザーで白文字のハロー効果（にじみ）による可読性低下の報告もある。純黒(#000)よりダークグレー(#121212前後)の方がOLEDでも眼精疲労配慮として推奨される。

出典: [prefers-reduced-motion (web.dev)](https://web.dev/articles/prefers-reduced-motion) / [Why Implementing Swipe Gestures Causes A Mobile Accessibility Issue](https://www.linkedin.com/pulse/why-implementing-swipe-gestures-causes-mobile-issue-jennison-asuncion)

### 1-14. 実装の現実: iOS Safari edge swipe / touch-action / visualViewport
- **edge swipe back衝突**: iOS Safari（ホーム画面PWA含む）は画面端からのスワイプで「戻る」ジェスチャが標準搭載されており、独自の横スワイプUIと衝突する。iOS 13.4以降、`touchstart`が画面端付近から発生したかを判定し`preventDefault()`することで部分的にブロック可能だが、**スクロール中に開始された戻るジェスチャはJSより優先され、ブロックできないケースがある**。Androidは既定でPWA standaloneのedge swipe backが無効という非対称がある。
- **touch-action**: `touch-action: pan-y`等で縦スクロールのみ許可し横方向をカスタムハンドラに渡すことは可能だが、ジェスチャ開始後の`touch-action`変更は反映されない。
- **visualViewport / ソフトキーボード**: iOS Safariはキーボード表示時にLayout Viewportをリサイズせず「せり上げる」独自実装のため、`bottom:0`固定要素はキーボード下に隠れる。`window.visualViewport`の`resize`/`scroll`イベントで検知・補正する実装が必須（2019年導入のAPI）。`safe-area-inset-bottom`はホームインジケータ用であり、キーボード出現時の補正には使えない。

出典: [Safari 13, Mobile Keyboards, And The VisualViewport API](https://tkte.ch/articles/2019/09/23/safari-13-mobile-keyboards-and-the-visualviewport-api.html) / [Blocking Navigation Gestures On iOS Safari](https://pqina.nl/blog/blocking-navigation-gestures-on-ios-13-4/) / [touch-action (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)

---

## 2. 補助知見: Recognition Rather Than Recall（Nielsen汎用ヒューリスティック）
- **主張**: システムはユーザーの記憶負荷を下げ、選択肢・操作・要素を可視化すべき。再認（見て選ぶ）は再生（思い出して入力・実行する）よりコストが低い。
- **モバイル適用の注意**: A案（原点からの方向を記憶で操作）・B案（入力欄に何を打てば何が起きるか記憶で判断）はいずれも「再生（recall）」寄りの設計であり、この原則に反する方向。可視ヒント・オンボーディング・常時プレビューでの補完が必要。

出典: [Recognition rather than Recall (NN/G)](https://www.nngroup.com/articles/recognition-and-recall/)

---

## 3. A案・B案・C案＋共通機能の採点

### A案（方向ドラッグ・マーキングメニュー方式、操作原点1つ）
- **成立する条件**: 主要動線の分岐数を1階層あたり最大4（Cowan 4チャンク説、marking menu研究のexpert performance限界）に抑える／操作原点をHooberのgreenゾーン（画面下端・利き手側）に固定／現在の方向候補を常時アイコン等で可視化し recognition を担保／VoiceOver ON時は自動的に通常ボタンUIへフォールバック／ドラッグ中はセンターに戻せばキャンセルできる（quasimode的な安全弁）。
- **破綻する条件**: 8方向まで使うとHick's law的上限＝記憶限界（Cowan約4）を超え、熟達しても marking menu 研究が示す性能限界に当たる。「上2/3が操作要素ゼロ」は初見ユーザーにとって原点の存在自体が発見不能（Norman & Nielsen 2010の直撃）。VoiceOverではカスタムジェスチャが標準スワイプと衝突し実質破綻。左下起点からのドラッグは iOS Safari／PWAの画面端戻るジェスチャと物理的に競合しうる。
- **必ず用意すべき代替手段**: 常時可視のヒント/オンボーディング、VoiceOver時の標準UIフォールバック、方向数の実用上限4、edge swipe実機衝突テスト必須。

### B案（ボトムタブ全廃・入力欄1つが主役、NV方式）
- **成立する条件**: ソフトキーボード出現時の`visualViewport`完全対応（B案の生命線）／「空欄／入力中／ゼロヒット」の3モードを色・アイコン・文言など複数チャネルで常時可視化（Raskinのmode visibility）／標準`<input>`ベースであればVoiceOverとの親和性はA/C案より本質的に高い。
- **破綻する条件**: テキストの有無だけで意味が変わる暗黙モードはmode errorの典型パターン（Raskin）。キーボードが主状態＝画面上半分に情報が圧縮され続け、Hooberの知見（画面上部は届きにくい・見づらい）と衝突。iOS Safariはキーボード表示中にLayout Viewportをリサイズしない独自実装のため、対応漏れで下部UIがキーボード下に埋もれるリスクが高い（実装事例で頻発する既知の落とし穴）。
- **必ず用意すべき代替手段**: 3モードの視覚的差別化、`visualViewport.resize`監視の実装必須化、キーボードを開かなくても「今日の面」の主要情報に触れられる非モーダルな経路。

### C案（横めくりページング、新聞紙面メタファ）
- **成立する条件**: 「めくる軸」と「読む軸」の直交はRaskin的には比較的安全（軸が違うため混同しにくい）／現在地・総ページ数を可視化するインジケータで位置把握コストを抑える／edge swipe衝突を避けるため画面最端ではなく内側起点のスワイプで判定。
- **破綻する条件**: 横めくり(paging) vs 縦スクロールの読書効率比較は**実証研究の結果が割れており（Dyson vs Chaparro）確定的な優位性はない**。横に流れるテキストの理解度低下（Harvey & Walker、推論設問で悪化）はC案と条件が異なり直接適用はできないが、「横方向の情報提示は認知コストが上がりうる」という傍証にはなる。iOS Safari／PWAのedge swipe backと真正面から衝突する。93本規模のノートで「今どこにいるか」の見通しを失いやすい。
- **必ず用意すべき代替手段**: ページ位置インジケータ、内側起点スワイプ判定＋実機衝突テスト、`prefers-reduced-motion`対応、長文は明記通り縦スクロールに一貫してフォールバック。

### 共通機能1: 2択の想起判定
- **採点**: Hick's law的には理論上最速の意思決定形態（n=2）で、これ自体は強く支持できる。WCAG2.5.8/Fittsの観点でも2ボタンなら大きく配置しやすく相性が良い。
- **注意点**: 左右（または上下）の意味役割を全画面・全セッションで固定すること。文脈で反転させるとRaskinの言うmode視認性問題に接続し誤タップの元になる。ジェスチャ（スワイプ）で判定させる場合は必ずボタンも並置し、Norman & Nielsenの発見可能性問題を回避する。

### 共通機能2: リンクのプレビュー（覗き見）
- **採点**: 発想としてはiOS標準のPeek & Pop（現Haptic Touch長押し）に近く前例がある。ただし「長押し」という**時間依存かつ不可視のパラメータ**に頼る操作は、Norman & Nielsenの批判（発見可能性ゼロ）が直撃する典型例。
- **注意点**: VoiceOverでは長押しが要素のアクションメニューと衝突しうるため代替導線（明示的な「プレビュー」ボタン等）が必要。プレビュー用ターゲットと本タップ用ターゲットを分離するなら、それぞれ独立してWCAG 2.5.8の24×24px以上を確保すること。押下中は視覚的フィードバック（進捗表示）を必須にする。

---

## 4. 「越えてはいけない線」チェックリスト（判定可能な形で）

1. 主要操作要素（操作原点／入力欄／ページ送りコントロール）は、画面高の下1/3以内（Hoober greenゾーン相当）に収める。画面上部1/3だけに主要導線を置かない。
2. タップ標的は最低44×44pt（iOS）/48×48dp（Android）を基準とし、いかなる場合もWCAG 2.5.8の**24×24 CSSピクセルを下回らない**（絶対下限）。
3. 隣接するタップ標的同士は、各ターゲット中心を中心とした24px径の円が重ならない間隔を確保する（WCAG 2.5.8 spacing例外の基準を満たす）。
4. ジェスチャのみでしか到達できない機能をゼロにする。すべてのジェスチャ操作に、可視のボタン／メニューという代替経路を用意する。
5. カスタムジェスチャUIは、VoiceOver（スクリーンリーダー）ON時に自動的に標準タップ操作（ボタン・リスト）へフォールバックする。実機VoiceOver検証をパスすることをリリース条件にする。
6. 画面端（特に左端）から開始する横方向ドラッグ／スワイプは、Safari実機とホーム画面PWA両方でiOS標準の戻るジェスチャと衝突しないことを確認する（衝突テストをリリース条件にする）。
7. マーキングメニュー的な方向選択は、1階層あたりの分岐数を最大8、日常的な主要動線は最大4に抑える（Cowan 4チャンク説、marking menu expert performance限界）。
8. モード（入力欄の空欄／入力中／ゼロヒット等）は、テキストの有無という1チャネルのみに依存せず、色・アイコン・文言など最低2チャネル以上で常時可視化する。
9. ソフトキーボード表示中でも、主要な状態表示・操作結果が`visualViewport`の可視範囲内に収まり隠れないことを、実機（iOS Safari）で確認する。
10. ページめくり・マーキングメニュー展開等のアニメーションは、`prefers-reduced-motion: reduce`時にパン・スケール系の動きを削減するか瞬間切替に置き換える。
11. 本文コントラスト比はライト/ダーク両テーマで4.5:1以上（大きな文字は3:1以上）を満たす。
12. 長押し等「時間」に依存する操作を採用する場合、押下中に進捗を示す視覚的フィードバックを表示し、押下中にキャンセル可能にする。
13. 2択UI（想起判定など）の位置と意味の対応関係は、全画面・全セッションを通じて固定する。文脈によって左右の意味を反転させない。
14. 横めくり形式のUIを採用する場合、現在地と総ページ数（または総記事数）を常時可視化するインジケータを設置する。
15. 取り消せない操作（既読化の確定、判定の確定等）は作らない。作る場合は3秒以内の取り消し猶予（Undo）を用意する。

## 5. 「破ってよい定石」リスト（定石だが根拠が弱い／この用途では不要）

1. **ボトムタブ4つ固定**: どの法則からも「4」という数自体に必然性はない。Hick's lawはむしろ選択肢は少なく浅い階層の方が有利であり、タブ数を4に揃える根拠は存在しない。
2. **カード型の縦リスト**: Fitts/Steeringの観点では、タップ標的が均一・予測可能であることが重要で、見た目がカードかテキスト行かは操作コストにほぼ影響しない。
3. **常時表示のナビゲーションバー**: recognition over recallの観点では有利だが必須ではない。読み専用・片手操作中心のPWAでは、コンテンツ占有率を優先して意図的に隠す設計も正当化できる（Hoober: 画面中央〜下部が主要接触面）。
4. **3D Touch/Force Touch的な「圧力」検知の再現**: 現行iPhoneは既にForce Touchを廃止済み。プレビューは長押し(long-press)で十分再現でき、圧力ハードウェア前提の設計は不要。
5. **デスクトップ由来の「ホバーで詳細表示」の踏襲**: 指にはホバーが物理的に存在しない。モバイルでの厳密な再現に固執する必要はなく、長押し等の別手段で目的（覗き見）は達成できる。
6. **Miller「7±2」を項目数の絶対上限として崇めること**: Miller本人が数値の乱用を否定しており、Cowanの再検証では実質4程度。項目数設計は「7」という数字そのものに呪縛されず、Hick's lawの実測とタスク文脈で決めるべき。
7. **iOS標準「スワイプで戻る」への全面依存**: 独自の横方向ナビゲーション（C案等）と共存させる場合は、標準の戻るジェスチャを画面内の特定ゾーンに限定するか、アプリ内ナビゲーションを優先してよい（ただしチェックリスト#6の実機衝突テストは必須）。
8. **タップ標的を視覚的に丸く・大きく強調する定石**: WCAG 2.5.8が問題にしているのはヒットエリア（当たり判定）のサイズであり、視覚的装飾の形状ではない。透明な当たり判定を24px以上確保すれば、視覚表現自体は小さなドットやテキストのみでもよい。
