# 片手操作・親指最適化・ボトムヘビーUI・ジェスチャ主導ナビゲーション リサーチ

担当分野: thumb zone / reachability、画面下部集中UI、ジェスチャ主導ナビゲーション、片手前提の極端設計、ラジアル/コーナーメニュー、利き手対応。muninn（読み専用・iPhone片手PWA・小規模データ・4ジョブ）への適用を見据えて調査。

---

## 1. 具体例一覧（最低8件）

| # | 例 | 主体/時期 | 現在 |
|---|---|---|---|
| 1 | Thumb Zone 研究（Hoober / Hurff） | 2013〜（UXmatters論文・Designing Mobile Interfaces） | 生きている（業界標準の参照モデル） |
| 2 | Apple Reachability | 2014〜（iPhone 6） | 生きている（Face ID機種は下端スワイプに変化） |
| 3 | Samsung One UI「viewing area / interaction area」 | 2018〜（SDC 2018） | 生きている（現行機種の基本方針） |
| 4 | Clear（Realmac Software） | 2012〜 | 生きている（2024年に無料化・大型刷新） |
| 5 | Mailbox（Orchestra→Dropbox） | 2013〜2016 | **廃止**（2016/2/26終了、パターンはGmail/Apple Mailに吸収） |
| 6 | Tweetbot（Tapbots） | 2011〜2023 | **実質終了**（2023/1 Twitter APIの意図的遮断で機能停止。UI設計の失敗ではない） |
| 7 | Snapchat のジェスチャ主導ナビ | 2011〜（右スワイプ=Stories、左=チャット） | 生きている（2017-18に一度タブ化して猛反発→ジェスチャ一部復元、現在は混成） |
| 8 | Path アプリの扇形（ラジアル）＋ボタン | 2010〜2018 | **廃止**（2018年サービス終了。パターン自体は他社UIに散った） |
| 9 | Pull-to-refresh（Loren Brichter / Tweetie） | 2008〜 | 生きている（事実上の業界標準ジェスチャ） |
| 10 | Tinder のカードスワイプ | 2012〜 | 生きている（Bumble/Hinge等に波及） |
| 11 | Safari iOS 15 ボトムタブバー→業界波及（Arc Search / Chrome / Firefox） | 2021〜2025 | 生きている（Safari自体は任意設定化されたが、Arc Search・Chrome・Firefoxが同方向に追随し現在進行形で標準化中） |
| 12 | Android Pie Controls（ParanoidAndroid由来） | 2014頃〜 | **ニッチ化/事実上廃れ**（root/カスタムROM文化の産物。Android 9以降のOS標準ジェスチャは採用せず） |
| 13 | 片手モード（Android 12ネイティブ／Samsung One Hand Operation+） | 2021〜 | 生きている |

---

## 2. 各例の詳細

### 2-1. Thumb Zone 研究（Steven Hoober / Scott Hurff）
- **仕組み**: Hooberは2013年、UXmatters論文「How Do Users Really Hold Mobile Devices?」で都市部で1,333件の実地観察を実施。片手持ち49%・片手持ち+反対の指タップ36%・両手持ち15%で、**親指がタップ操作の75%を担う**ことを実証。画面を「Natural（下1/3・親指が自然に届く）」「Stretch（中央1/3・グリップ変更なしで届くが伸ばす必要）」「Hard（上1/3・持ち替えが必要）」の3ゾーンに分割。Scott Hurffはこのデータを使い、iPhoneの各モデルサイズごとの視覚的ヒートマップ（Thumb Zone図）を作成し普及させた。
- **削った操作コスト**: 「持ち替え」という最重コスト（把持の再構成＝一時的に操作不能になる）を可視化し、頻出操作を持ち替え不要な帯に配置する設計判断を可能にした。
- **効く理由**: 人間工学的制約（親指の可動域は手のひらを支点とした扇状の弧）に基づく実測データであり、感覚論ではない。
- **批判/限界**: 画面サイズ・利き手・ケースの有無・机上/歩行中などのコンテキストで実際のゾーンは変動する。「3分割」は単純化しすぎという指摘もあり、あくまで意思決定の出発点。
- 出典: [UXmatters](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php), [Smashing Magazine](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/), [Scott Hurff Medium](https://medium.com/@scotthurff/thanks-for-including-my-thumb-zone-diagrams-57b4201d21b1)

### 2-2. Apple Reachability
- **仕組み**: 2014年iPhone 6/6 Plusでの大画面化に対応し導入。ホームボタンの二度タップ（Face ID機種では下端の軽いスワイプダウン）で、画面全体のコンテンツを画面下半分まで引き下げて表示する。もう一度タップ/画面外タップで復帰。
- **削った操作コスト**: 画面最上部のナビゲーションバー・ステータス操作へ届くための「持ち替え」を、恒常的なレイアウト変更ではなく**一時的な呼び出し**で解決。UIの通常配置は変えない。
- **効く理由**: 「頻度は低いが必要になる」操作（上部到達）に対して、常時レイアウトを歪めるのではなくオンデマンドの脱出ハッチを用意する非対称設計。認知負荷を増やさない。
- **破綻/批判**: 発見性が低く、多くのユーザーが機能自体を知らずに使わない。Face ID機種移行でジェスチャが変わり（下端スワイプ）学習コストが再発生。
- 出典: [AppleInsider](https://appleinsider.com/articles/17/10/31/how-to-enable-and-use-reachability-on-iphone-x), [NN/g](https://www.nngroup.com/articles/iphone-x/)

### 2-3. Samsung One UI（viewing area / interaction area）
- **仕組み**: 2018年SDC発表。画面を上下に分割し、上部を「見る」領域（コンテンツ・画像・リスト）、**下半分を「操作する」領域**（ボタン・トグル・タイトルすら含む）として恒常的に再配置。Reachabilityのような一時呼び出しではなく、レイアウト自体を作り替えた点が特徴的。
- **削った操作コスト**: 大画面Androidで最も頻発する「上部UIへの持ち替え」を、都度の呼び出しではなく**構造的に発生させない**設計にした。
- **効く理由**: One-time gestureに依存せず、恒常的な配置転換なので学習・発見コストがゼロ（何も覚える必要がない）。
- **破綻/批判**: 画面上部が「見るだけ」になることで、コンテンツと操作の物理的距離が生まれ、確認しながら操作する場面（例: プレビュー→確定）でのスキャンコストが増える場合がある。
- 出典: [Samsung公式デザインガイド](https://design.samsung.com/global/contents/one-ui/download/oneui_design_guide_eng.pdf), [Medium: The Story of Samsung's OneUI](https://medium.com/kubo/the-story-of-samsungs-oneui-9ecee8657844)

### 2-4. Clear（Realmac Software）
- **仕組み**: 2012年発売。タブもボタンもナビゲーションバーも持たない**全ジェスチャUI**。右スワイプ=完了、左スワイプ=削除、下に引く=新規項目追加、ピンチアウト=リスト内に入る/項目挿入、ピンチイン=リスト一覧に戻る。
- **削った操作コスト**: 画面上の「タップ対象を狙う」操作そのものを排除し、リスト全体を対象にした大振りな動作に置き換えた。誤タップの精度要求をなくした。
- **効く理由**: ジェスチャの本数を極小（4種）に絞り、かつ物理メタファ（引き寄せる＝追加、払いのける＝削除）と一致させたことで、初見でも類推可能な範囲に収めた。
- **破綻/批判**: 発表当初「操作方法が分からない」という声が一定数あり、後年のバージョンでオンボーディングチュートリアルを追加。ボタンが一切ないため、初回起動時の学習コストは避けられない。
- 出典: [TechCrunch](https://techcrunch.com/2012/02/14/clear-why-this-simple-to-do-list-app-has-everyone-talking/), [AlternativeTo](https://alternativeto.net/news/2024/1/popular-to-do-list-app-clear-gets-big-design-overhaul-and-goes-free-with-in-app-theme-shop/)

### 2-5. Mailbox
- **仕組み**: 2013年公開、右スワイプでアーカイブ/削除、左スワイプで「スヌーズ」（後で見る＝1時間後/明日/来週に再出現）。「Auto-Swipe」でフィルタ的な自動処理も提供。
- **削った操作コスト**: メール処理の意思決定を「今すぐ対応/今は無視して後で」の二択に単純化し、スワイプ方向とその二択を1:1対応させた。
- **効く理由**: 受信トレイの認知負荷（「これ今読むべき?」の逐一判断）を、スワイプという低コストな身体動作に変換し、判断の摩擦を減らした。
- **破綻/批判**: サービス自体はDropboxによる買収後2016年に終了（設計の失敗ではなく事業判断）。ただし**パターンは生き残り**、Gmail・Apple Mail・Outlookが同様のスワイプアクションを標準搭載するに至った＝「勝ったのは会社ではなくパターン」という好例。
- 出典: [9to5Mac](https://9to5mac.com/2015/12/07/dropbox-mailbox-carousel-shutdown/), [Inc.](https://www.inc.com/justin-bariso/dropbox-just-killed-mailbox-the-greatest-email-app-of-all-time.html)

### 2-6. Tweetbot
- **仕組み**: 右スワイプは2段階（浅い=いいね、深い=リプライ）、左スワイプで会話ツリー表示。後年「Behaviors」設定で各スワイプの割当をユーザーがカスタマイズ可能に。
- **削った操作コスト**: 「いいね」のような最頻出アクションを、ボタンタップより速い浅いスワイプに割り当て、頻度に応じて操作コストを段階化した。
- **効く理由**: スワイプの**深さ**（distance）を情報量として使うことで、1ジェスチャーの語彙を実質2倍にした（浅い/深いスワイプ）。
- **破綻/批判**: UI自体への批判はほぼ無く、2023年1月にTwitter社がAPIアクセスを意図的に遮断したことでアプリが機能停止＝**外部要因によるプラットフォームリスク**の典型例（自社で閲覧体験を作るmuninnには本質的に無縁だが、"サードパーティ製の閲覧アプリは配信元次第で死ぬ"という教訓は示唆的）。
- 出典: [Tapbots Tips](https://tapbots.com/tweetbot/tips/), [TechCrunch](https://techcrunch.com/2023/01/16/twitters-third-party-client-issue-is-seemingly-a-deliberate-suspension/)

### 2-7. Snapchat のジェスチャ主導ナビゲーション
- **仕組み**: タブバーを持たず、カメラ画面を中心に上下左右スワイプで機能を切り替える（右=Stories、左=チャット、上=Discover、下=カメラ）。
- **削った操作コスト**: 「どこを見ればナビゲーションがあるか」を探すスキャンコスト自体をなくし、画面のどこからでも同じジェスチャーで移動できるようにした。
- **効く理由**: 若年層の高頻度利用者には、一度覚えれば視線を落とさず操作できる「ブラインドタッチ」的優位性がある。
- **破綻/批判**: 2017-18年に一度タブ型（Friends/Discoverの分離）へ大改修したが、既存ユーザーから猛反発（Change.orgに数百万人が署名したことで有名）。**「学習済みの高速操作」を「発見しやすいが低速な操作」に置き換えると、ヘビーユーザーほど強く離反する**という重要な反証データになった。結果的にジェスチャーの一部が復活する形で軌道修正。
- 出典: [IXD@Pratt批評](https://ixd.prattsi.org/2017/09/design-critique-snapchat-is-counter-intuitive/), [Medium](https://medium.com/design-bootcamp/snapchats-intuitive-ux-redefining-communication-through-innovative-design-6bf1ef4da617)

### 2-8. Path アプリの扇形（ラジアル）＋ボタン
- **仕組み**: 画面下部の「＋」ボタンを押すと、投稿種別（写真・位置情報・音楽・テキスト等）のアイコンが**画面下端を起点に90度の扇状**に展開するアニメーション。画面中央からではなく**画面端（コーナー）を起点**にする設計が特徴。
- **削った操作コスト**: サブメニューを開くための「別画面遷移」を排除し、親指の可動域（下端起点の扇）にちょうど乗る配置でメニュー全項目に到達可能にした。
- **効く理由**: 起点を画面端に置くことで、親指の付け根を支点にした自然な弧の動きとメニューの弧が一致する（Thumb Zoneの物理的整合）。
- **破綻/批判**: 項目数が増えるとメニュー弧が窮屈になり拡張性に乏しい（Pathは項目を絞ることで対処）。Path自体は2018年にサービス終了（過剰通知など別要因）だが、ラジアルメニューという発想はゲームUI・一部ランチャーアプリに継承。
- 出典: [Luis Abreu: Gesture-based Radial Menus](https://lmjabreu.com/post/gesture-based-radial-menus/)

### 2-9. Pull-to-refresh（Loren Brichter / Tweetie）
- **仕組み**: 2008年、TweetieのLoren Brichterが考案。リストを一番上まで引っ張って離すと更新される。「更新ボタンを探してタップする」動作を「読んでいたスクロールの延長」に統合。2010年TwitterがAtebits（Tweetie開発元）を買収し標準搭載、2013年に特許取得も「攻撃的には使わない」と宣言し事実上業界に無償開放。
- **削った操作コスト**: 「専用ボタンを探す」という視線移動＋精密タップを、既存のスクロール動作の自然な延長に統合し、新しい操作を実質ゼロコストにした。
- **効く理由**: 既存の運動パターン（指を上に払う＝スクロール）を再利用し、新規学習をほぼ要求しない「ジェスチャーのオーバーロード」の成功例。
- **破綻/批判**: 今日では逆に「使いすぎ」批判がある——本来リストの先頭にいる時だけ意味を持つはずが、あらゆる画面に機械的に実装され「何が起きるか予測できない」ケースも増えた。
- 出典: [Wikipedia: Pull-to-refresh](https://en.wikipedia.org/wiki/Pull-to-refresh), [MacStories](https://www.macstories.net/news/loren-brichter-talks-about-pull-to-refresh-patent-and-design-process/)

### 2-10. Tinder のカードスワイプ
- **仕組み**: 2012年、共同創業者Jonathan Badeenがトランプのカードを弾く動作からヒント。右スワイプ=Like、左スワイプ=Pass。当初はボタンのみで、スワイプは後から追加された。
- **削った操作コスト**: 意思決定（好き/嫌い）を「タップして次へ」の2アクションから「1回の身体動作」に圧縮。判断の心理的コストと操作コストを同時に軽量化。
- **効く理由**: ゲーミフィケーション（カードを"投げる"快感、物理シミュレーションの慣性）により、単純作業を報酬感のある反復行動に変換した。
- **破綻/批判**: 判断の軽量化が行き過ぎ「一瞬の外見だけで判断する」という社会的批判の的にもなった。誤スワイプ（Undo機能"Rewind"は後年の有料機能として追加）という事故コストも存在。
- 出典: [VentureBeat](https://venturebeat.com/2016/04/04/why-swipe-right-wasnt-in-the-first-version-of-tinder/), [CNBC](https://www.cnbc.com/2017/01/06/how-a-tinder-founder-came-up-with-swiping-and-changed-dating-forever.html)

### 2-11. Safari iOS 15 ボトムタブバー → Arc Search / Chrome / Firefoxへの波及
- **仕組み**: iOS 15（2021）でSafariのアドレスバー・タブバーを画面下部に統合するフローティングUIを導入。ベータ期間中の反発を受けAppleは「単一タブ表示に戻す」設定を追加（完全撤回ではなく選択制に）。Arc Search（2023〜）はこれを極限まで推し進め、**起動と同時にキーボードが立ち上がった状態**で待機し、下部に検索・お気に入り・ブックマークを集約。Chrome for Android は2024〜2025年にかけて下部アドレスバーを段階ロールアウト。Firefox for Androidも上下切替をユーザー設定で提供。
- **削った操作コスト**: URLバー・タブ操作という「毎回発生する高頻度操作」への到達距離を最短化。
- **効く理由**: モバイルブラウザは全操作の起点がアドレス/検索であるため、最頻出操作を最短距離に置く投資対効果が最も高いカテゴリだった。
- **破綻/批判**: Safariの初期実装は「タブの見た目が分かりにくい」「片手のジェスチャーで誤って別サイトに移動する」など強い批判を受け、選択式に後退。**「下に置けば良い」わけではなく、既存の視覚的階層（今どのタブ・どのサイトにいるか）を壊さない実装が必須**という教訓。
- 出典: [9to5Mac](https://9to5mac.com/2021/09/20/dont-like-new-safari-design-address-bar-on-top/), [MacStories: Arc Search](https://www.macstories.net/reviews/arc-search-for-iphone/), [9to5Google: Chrome bottom bar](https://9to5google.com/2025/04/15/chrome-bottom-address-bar-android-135/)

### 2-12. Android Pie Controls（ParanoidAndroid由来）
- **仕組み**: 2014年頃、カスタムROM「ParanoidAndroid」発の機能。画面端からスワイプすると、ホーム/戻る/最近のアプリ等を**扇状（パイ）に**表示するフローティングナビ。LMT LauncherやGravityBoxなど非公式アプリ/Xposedモジュールとして拡散。
- **削った操作コスト**: 固定ナビゲーションバーが占有する画面領域そのものをゼロにし、必要な時だけ端から呼び出す。
- **効く理由**: Path同様、画面端起点＝親指の可動域と一致。
- **破綻/批判**: **root権限やカスタムROMが前提**という時点で一般ユーザー層には届かず、Android 9 Pieの正式なジェスチャーナビゲーション（下端スワイプ＋ホームインジケータ）はこの"パイ・コントロール"のラジアル発想を採用せず、iOSに近い直線的ジェスチャーに収束した。**優れたコンセプトでも、OSレベルの端（エッジ）は既に他の機能（戻る/ホーム/通知）に占有されており、後発の同エリア機能は競合を起こしやすい**という限界を象徴する事例。
- 出典: [Android Authority](https://www.androidauthority.com/permanent-navigation-controls-and-more-with-gravitybox-pie-controls-android-customization-676680/), [Hongkiat](https://www.hongkiat.com/blog/pie-controls-rooted-android/)

### 2-13. 片手モード（Android 12ネイティブ / Samsung One Hand Operation+）
- **仕組み**: Android 12は画面全体を下方＆片側に縮小表示するモードを標準搭載。Samsungは独自に「One-handed mode」（画面を左右どちらかに縮小、矢印タップで左右反転）と、Good Lock経由の追加モジュール「One Hand Operation+」（ジェスチャーで特定アプリ・トグル・スクショに即到達）を提供。
- **削った操作コスト**: Reachabilityと同系統だが、**左右どちらの手でも使う想定**（利き手切替）を明示的にサポートする点が異なる。
- **効く理由**: 片手操作の困難は「画面が大きい」だけでなく「利き手がどちらか」にも依存するため、単一の縮小ではなく左右反転をワンタップで提供することでカバー範囲を広げている。
- **破綻/批判**: 設定項目がGood Lockのような追加インストールの奥深くに埋もれており、発見性が低い（"隠れた神機能"としてしばしば再発見記事化される）。
- 出典: [Android Central](https://www.androidcentral.com/how-enable-one-handed-mode-android-12), [SamMobile](https://www.sammobile.com/news/how-do-i-enable-one-handed-mode-on-larger-phones/)

---

## 3. 抽出できる原理（一般化）

1. **「下1/3=無理なく届く／上1/3=持ち替えが要る」という物理制約は不変の前提であり、頻出操作は必ず下1/3に置く。** レイアウトを恒常的に変える（One UI）か、一時的に呼び出す（Reachability）かは選択肢だが、「稀にしか要らない操作のために毎回上部までUIを配置する」設計は原理的に非効率。
2. **到達距離ゼロを狙うなら、UIを親指に近づけるのではなく、操作の起点を画面の端・コーナーに置く。** Path・Pie Controls・スワイプバックはいずれも「画面端を支点にした弧」を利用しており、通常のタップ配置より可動域との整合性が高い。ただしOSが既にその端を戻る/ホームに割り当てている場合は競合するため、**空いているエッジを取り合う**発想が必要。
3. **ジェスチャーは「発見性」と引き換えに「速度」を買う取引である。** 語彙が少なく（3〜4種以内）、方向とメタファが一致し（右=前向き/完了、左=後ろ向き/破棄）、既存の運動パターン（スクロールの延長としてのpull-to-refresh）を再利用するときに限り、学習コストなしで定着する。逆に、独自語彙のフルジェスチャーUI（Clear、初期Snapchat）は必ずオンボーディングか可視ヒント（部分的にめくれた端など）を伴わないと離脱を招く。
4. **一時的な脱出ハッチ（Reachability型）と恒常的な再配置（One UI型）は別の解であり、後者の方が学習コストが低い。** 前者は「使い方を知らないと存在しないのと同じ」というリスクを常に負う。
5. **高頻度で習熟したユーザーほど、ジェスチャー→タブ型のような「発見しやすいが低速な」設計への退行に強く反発する。** Snapchatのタブ化炎上が示す通り、UIの「わかりやすさ」向上が既存ヘビーユーザーには「改悪（遅くなった）」と映る非対称性がある。改修時は新規/既存ユーザーで評価が割れることを前提にすべき。
6. **破壊的・不可逆な操作を軽量ジェスチャーに割り当てると事故率が上がる。** Tinderの誤スワイプ・Rewind機能が示す通り、判断コストを下げる設計と誤操作の取り消し可能性（Undo）はセットで設計する必要がある。

---

## 4. muninn への適用具体案（5つ、ボツ理由つき）

### 案A: 「見る/操作する」上下二層レイアウト（One UI方式）への全面移行
現行の「下タブ4つ＋縦スクロールのカードリスト」を廃し、**画面上2/3をコンテンツ表示専用**（記事本文・カード表・在庫一覧）、**下1/3を常時「操作エリア」**（現在のジョブに応じたコンテキストアクション：次のカード／わかった・あやしい／検索を開く／Claudeへの依頼に追加）に固定する。One UIの「見る/操作する」分離をそのまま輸入。
- **ボツになりうる理由**: muninnには④ジョブ（Claudeへの依頼作成）のように「複数のノートを横断選択して伝票に積む」操作があり、これは単純な下部ボタン1個では収まらない（複数選択状態の可視化が必要）。下1/3固定エリアだけでは表現力不足になり、結局モーダルやシートを重ねることになって二重構造化する恐れがある。

### 案B: 想起カード（間隔反復）だけをTinder型スワイプ判定にする
体験の心臓部である「再読カード」（問いを見て思い出し、わかった/あやしいを判定）にのみ、Tinderのカードスワイプ（右=わかった、左=あやしい）を採用。他の一覧・記事画面はスワイプ化しない。
- **ボツになりうる理由**: SRSの判定は将来の復習間隔を左右する重要な意思決定であり、誤スワイプ（scrollとの誤判定、指が滑った等）がそのまま学習履歴を汚染する。TinderでさえRewind機能を後付けした通り、Undoなしの1スワイプ確定は事故コストが高い。実装するなら「スワイプ→確認のマイクロ猶予（元の位置に少し戻るアニメーション＋数百msのキャンセル余地）」もセットで設計しないと危険。

### 案C: ジョブ切り替えを「タブ」ではなく「画面下端起点の片手スワイプ」にする（Snapchat/Path方式）
4タブ（面/棚/探す/デスク）を可視のタブバーではなく、画面下端から指を離さず左右にスワイプすることで切り替えるジェスチャーナビゲーションにする。Path風に下端起点で軽く弧を描くと現在ジョブ以外の3つがミニプレビュー付きで扇状に見える。
- **ボツになりうる理由**: iOSは既に画面下端（ホームインジケータ）と左端（戻る）をOSジェスチャーに占有しており、PWA（ホーム画面起動のstandalone表示）ではブラウザバー相当のものはないが、下端はやはりホームへ戻るシステムジェスチャーと競合しやすい。加えてSnapchatのタブ化炎上の逆（ジェスチャー化）は、**とっつきにくさ＝新規/低頻度ユーザーへの学習コスト**を必ず生む。muninnは「毎日使う」前提の個人用途とはいえ、n=1ユーザーが操作を忘れた時のリカバリ手段（可視のタブ）を完全に捨てるのはリスクが高い。

### 案D: 起動直後は「今日の1枚」だけを画面下半分に差し出す（Yahoo News Digest + Reachability合成）
アプリを開いた瞬間、画面上部は空白/装飾のみで、**下半分に「今日読むもの」1枚だけ**を表示（①めくるジョブに極振り）。他ジョブへは明示的な操作（下端を軽く上に払う等）でのみ到達可能にする。
- **ボツになりうる理由**: データ規模が90本程度と小さいmuninnでは、「今日の1枚」だけの一本道導線は②在庫俯瞰ジョブへの動線を弱め、結果的に「同じ入り口しか使わない」体験の硬直化を招く。Yahoo News Digestは大量のニュースを絞り込む価値があったが、muninnは元々小規模で俯瞰性こそが価値の一部（「何があったっけ」を楽しむ）なので、逆効果になりうる。

### 案E: Claudeへの依頼を「コーナー起点の片手ドラッグ」で伝票に積む
ジョブ④（Claudeへの依頼作成）に特化し、任意のカード/記事を**右下角から指を離さず円弧を描く**とその場で「伝票に追加」の扇メニューが開く（Path方式のミニ版）。テキスト選択→共有シート、のような多段階操作を1ジェスチャーに圧縮。
- **ボツになりうる理由**: Android Pie Controlsの教訓と同じく、画面コーナーはOS/ブラウザのシステムジェスチャー（スワイプバック、コントロールセンター呼び出し等）と衝突しやすく、発見性も低い「隠しジェスチャー」批判をそのまま受ける。個人用アプリで学習投資を払う本人（開発者=利用者）だけなら成立しうるが、「毎回同じ弧をきれいに描けないと誤発動する」実装コストとリターンが見合わない可能性が高い。

---

## 5. Web（PWA）で再現する際の技術的勘所

- **`env(safe-area-inset-*)` は `viewport-fit=cover` が meta viewport になければ常に0を返す。** さらに **PWAをホーム画面から起動した standalone 表示と、Safariのタブ内表示とでは inset の値が異なる**（standaloneはホームバー分34pt、ブラウザ内はアドレスバー分の余白がありinset自体は変わるケースがある）。下部固定バーの高さは両モードで実機検証必須。
- **iOSソフトウェアキーボード表示時、レイアウトビューポート（`window.innerHeight`）は変化せず、ビジュアルビューポートだけが縮む。** `resize` イベントは発火しないため、下部固定コントロール（検索バー・アクションバー）をキーボードの上に追従させるには `window.visualViewport` の `resize`/`scroll` イベントを購読し、`position: fixed` ではなく `visualViewport.height` を使った動的な `top` 指定（または新しい `interactive-widget=resizes-content` viewport指定、対応バージョンのみ）で調整する。
- **`backdrop-filter`（ダーク×グラス系デザインの核）はiOS SafariでGPUブラーパスを毎回走らせる高コスト処理。** カード一覧を縦スクロールする画面で、カードごとにガラス質感を付けると顕著なフレーム落ちが起きる。**ブラーを複数レイヤーに重ねない**（ネストしたbackdrop-filter同士は特に重い）、**blur半径は8〜16px程度に抑える**、**常時表示ではなく固定要素（下部の操作バー1枚など）に限定して使う**のが安全。`-webkit-backdrop-filter` の併記は必須。
- **ジェスチャー実装（スワイプ判定・ドラッグ）は `touch-action` CSSと非パッシブ `touchmove` の組み合わせに注意。** `touchmove` で `preventDefault()` を呼ぶ非パッシブリスナーはブラウザのネイティブスクロールを止めるため、スクロールとカードスワイプ判定が同じ縦方向軸で競合する場合、**`touch-action: pan-y`（縦スクロール許可＋横ジェスチャーだけ奪う）のように軸を分離**しないと「スクロールしようとしたら誤ってカード判定された」事故が起きる（案Bのリスクと直結）。300msタップ遅延自体はviewport meta指定済みなら現代のiOS Safariでは解消済みで気にしなくてよい。
- **Reachability相当のOSジェスチャー（下端スワイプでUIを引き下げる）はPWAには存在しない。** 独自実装する場合、ホームインジケータのシステムジェスチャー領域（画面最下部数px〜十数px）と操作が衝突しやすいため、下端ギリギリにタッチ起点を置くカスタムジェスチャーは避け、多少上に余白（44px程度＝Appleのタップ推奨最小サイズ相当）を取るのが安全。
- **PWAのstandalone表示は「戻る」ボタンがOSレベルで用意されない**（Androidは戻るジェスチャー/ボタンが効くが、iOSのstandalone PWAにはブラウザの戻る操作がない）。ジェスチャーナビゲーションで画面遷移を作る場合、iOS PWAでは**アプリ内に独自の戻る導線を必ず用意する**必要がある（システムに委譲できない）。

---

## 主要出典まとめ
- [UXmatters: How Do Users Really Hold Mobile Devices?](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)
- [Smashing Magazine: The Thumb Zone](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/)
- [Samsung One UI Design Guidelines (PDF)](https://design.samsung.com/global/contents/one-ui/download/oneui_design_guide_eng.pdf)
- [AppleInsider: Reachability](https://appleinsider.com/articles/17/10/31/how-to-enable-and-use-reachability-on-iphone-x)
- [NN/g: iPhone X, The Rise of Gestures](https://www.nngroup.com/articles/iphone-x/)
- [TechCrunch: Clear](https://techcrunch.com/2012/02/14/clear-why-this-simple-to-do-list-app-has-everyone-talking/)
- [9to5Mac: Mailbox shutdown](https://9to5mac.com/2015/12/07/dropbox-mailbox-carousel-shutdown/)
- [TechCrunch: Twitter API third-party client suspension](https://techcrunch.com/2023/01/16/twitters-third-party-client-issue-is-seemingly-a-deliberate-suspension/)
- [IXD@Pratt: Snapchat design critique](https://ixd.prattsi.org/2017/09/design-critique-snapchat-is-counter-intuitive/)
- [Luis Abreu: Gesture-based Radial Menus (Path)](https://lmjabreu.com/post/gesture-based-radial-menus/)
- [Wikipedia: Pull-to-refresh](https://en.wikipedia.org/wiki/Pull-to-refresh)
- [VentureBeat: Tinder swipe origin](https://venturebeat.com/2016/04/04/why-swipe-right-wasnt-in-the-first-version-of-tinder/)
- [9to5Mac: Safari iOS 15 controversy](https://9to5mac.com/2021/09/20/dont-like-new-safari-design-address-bar-on-top/)
- [MacStories: Arc Search review](https://www.macstories.net/reviews/arc-search-for-iphone/)
- [9to5Google: Chrome bottom address bar rollout](https://9to5google.com/2025/04/15/chrome-bottom-address-bar-android-135/)
- [Android Authority: Pie Controls](https://www.androidauthority.com/permanent-navigation-controls-and-more-with-gravitybox-pie-controls-android-customization-676680/)
- [Android Central: One-handed mode Android 12](https://www.androidcentral.com/how-enable-one-handed-mode-android-12)
- [Don Norman (jnd.org): Gestural Interfaces: A Step Backwards In Usability](https://jnd.org/gestural-interfaces-a-step-backwards-in-usability/)

**未確認/裏取り不十分な点**: Spotifyモバイルのミニプレイヤーにおける具体的なスワイプ挙動（上スワイプで全画面展開、左右スワイプで曲送り等）は一般に知られたパターンだが、一次情報での明確な確認は取れていない。Nintendo系のエッジスワイプ事例は本調査では実在の一次情報を特定できず、扱いを見送った。
