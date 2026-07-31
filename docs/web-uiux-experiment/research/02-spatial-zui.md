# 空間UI・ZUI・無限キャンバス・地図的ナビゲーション リサーチ

対象: muninn（個人ナレッジベース閲覧サイト、React+Vite PWA、iPhone片手操作、ダーク固定、記事~90本・タグ~20・ノード総数~200）の"尖ったUIUX"刷新のための一次情報調査。
既存原則: 「90ノードのforce-directedグラフは毛玉になるので作らない」「一度に見せるノードは12点まで」「レイアウトは決定的」。

---

## 1. 具体例一覧（16件・すべて一次情報で確認）

### 1-1. ZUI（ズーマブルユーザーインターフェース）系譜

#### ① Pad++ / Jazz（Bederson & Hollan, 1994, University of New Mexico）
- **時期**: 1994年発表（UIST'94）。後継 Jazz（Java版, 2000年代前半）→ Piccolo/Piccolo2D ツールキットに継承。
- **現況**: プロダクトとしては終了。学術系譜（Piccolo2D, JavaFX的ZUI研究）としてのみ生存。**事実上死亡**。
- **仕組み**: 2次元平面上に任意サイズでオブジェクトを配置し、ズームを基本ナビゲーション手段とする。ウィンドウ／アイコンのメタファを置き換える研究。
- **何を削ったか**: ウィンドウの開閉操作、フォルダ階層の逐次ナビゲーション。
- **なぜ効くとされたか**: 空間内の「相対位置」と「相対サイズ」がそのまま情報の重要度・関係性を表す、という仮説（空間記憶の転用）。
- **破綻・批判点**: 実装コストが高く（独自レンダリングエンジンが必要）、一般ユーザーの操作モデルとして定着しなかった。後年の実証研究（Hornbæk et al. の "Navigation patterns and usability of zoomable user interfaces with and without an overview"）でも、**オーバービューなしのZUIは道に迷いやすい**ことが示されている。
- 出典: [Pad++: A Zoomable Graphical Interface System (cs.umd.edu PDF)](https://www.cs.umd.edu/~bederson/images/pubs_pdfs/p23-bederson.pdf), [ACM DL](https://dl.acm.org/doi/10.1145/192426.192435), [Navigation patterns and usability of ZUIs with/without overview](https://dl.acm.org/doi/abs/10.1145/586081.586086)

#### ② Jef Raskin『The Humane Interface』の ZoomWorld / Archy
- **時期**: 書籍2000年。Archy実装は2000年代前半〜2005年（Raskin没後にRaskin Centerが継続、後に方向転換）。
- **現況**: **終了**。プロジェクトはFirefox拡張「Ubiquity」へとピボットし、ZUI自体は放棄された。
- **仕組み**: デスクトップやウィンドウ概念を廃し、全文書を1枚の2次元平面上に配置。ズームアウトで全体、ズームインで個別文書を編集。
- **何を削ったか**: アプリ切り替え・ウィンドウ管理・モード切り替えのコスト。
- **なぜ効くとされたか**: Raskinの「モードレス」「habituation（習慣化された動作の温存）」理論。空間位置を覚えれば検索なしで戻れるという主張。
- **破綻点**: 実装が本人の死去で頓挫し、実用検証がほぼされないまま終わった。理論先行で実証が弱い。
- 出典: [The Humane Interface (Wikipedia)](https://en.wikipedia.org/wiki/The_Humane_Interface), [Archy (software) - Wikipedia](https://en.wikipedia.org/wiki/Archy_(software)), [Raskin Center](https://raskincenter.org/rchi/)

#### ③ Eagle Mode（zoomable file manager）
- **時期**: プロジェクト開始2000年代、**現在も活発に開発中**（v0.96.3 が2025年2月リリース、v0.96.2が2024年8月）。
- **現況**: **生存**。ただしニッチ（Linux/Windows向けOSS、GPLv3、実ユーザーは少数の愛好家層）。
- **仕組み**: ファイルもゲームも音楽プレイヤーも「ズームして入っていく」1つの仮想空間（"virtual cosmos"）として統合。
- **何を削ったか**: ファイルマネージャ⇄ビューア⇄プレイヤーのアプリ切り替え。
- **なぜ効くか**: ズームだけで「開く」操作が完結し、モード切り替えの認知負荷がゼロになる。
- **破綻点**: デスクトップ専用（マウス/キーボード前提）。**モバイルのピンチズーム単指操作不可な文脈には移植困難**という設計。20年ニッチのまま普及していない＝一般ユーザーへの学習コストの高さの傍証。
- 出典: [Eagle Mode公式](https://eaglemode.sourceforge.net/), [LWN.net記事](https://lwn.net/Articles/608841/), [GitHub](https://github.com/probonopd/eaglemode)

#### ④ Prezi（ズーミング・プレゼンテーション）
- **時期**: 2009年launch。**現在も生存**（2026年時点でもレビュー記事多数、商用継続）。
- **仕組み**: スライドではなく1枚の巨大キャンバス上にコンテンツを配置し、事前定義したパスに沿ってズーム・パンしながら「移動」するプレゼン。
- **何を削ったか**: スライド間の唐突な切り替え、階層構造の説明コスト（全体→詳細のズームで「今どこにいるか」を可視化）。
- **なぜ効くとされたか**: 空間的な「距離」がコンテンツ間の関係性のメタファになる。
- **破綻・批判点（最重要）**: **「Prezi motion sickness（乗り物酔い）」がユーザーレビューで最頻出の苦情**。TrustRadius・G2等のレビューで繰り返し言及。特に高齢層で顕著と報告される。原因はパス作成者が距離・回転を無頓着に設定することで、ズーム・パン・回転が複合すると前庭感覚と視覚のミスマッチを起こすため。**「ズーム/パンのモーションは非注視の受動的な移動として強制されると酔いを誘発する」という強い実例**。
- 出典: [Ned Potter: How to stop your Prezi making people sick](https://www.ned-potter.com/blog/how-to-stop-your-prezi-making-people-sick), [BrightCarbon: The problems with Prezi](https://www.brightcarbon.com/blog/the-problems-with-prezi/), [Hacker News議論 2026](https://news.ycombinator.com/item?id=47665194)

#### ⑤ Windows 8 スタート画面のセマンティックズーム
- **時期**: 2012年。**Windows 10（2015年）で実質廃止**（スタート画面自体が姿を消した）。
- **仕組み**: タイル画面でピンチインすると、個々のタイルの拡大表示からグループ単位の縮小俯瞰表示へ切り替わる（Bedersonらの semantic zoom 研究の商用実装）。ズームは見た目の拡大縮小ではなく「表示密度・情報粒度の切り替え」という点でPrezi的ZUIと区別される。
- **何を削ったか**: 大量タイルのスクロール量。
- **破綻点**: タイル画面自体（デスクトップを覆う全画面UI）へのユーザー反発が大きく、セマンティックズーム単体の評価は埋もれた。**「ジェスチャーの発見可能性が低い」（ピンチしないと存在に気づけない機能）という共通の弱点**が示唆される。
- 出典: [Windows 8: Semantic Zoom versus Optical Zoom](https://blog.jerrynixon.com/2012/03/windows-8-semantic-zoom-versus-optical.html), [Why Did Windows 8 Fail? - MakeUseOf](https://www.makeuseof.com/windows-8-fail-retrospective/)

### 1-2. 無限キャンバス製品（モバイル挙動に注目）

#### ⑥ Obsidian Canvas
- **時期**: 2022年〜。**生存・活発開発中**。
- **モバイル実態**: 標準でピンチズーム対応だが、Androidで「再開時にピンチズームの中心が左に飛ぶ」バグ、"Zoom to Fit" が選択ノードから大きくズレるバグが報告されている。
- **示唆**: **無限キャンバス＋ピンチズームの実装は"できて当然"ではなく、大手OSSでも2年以上バグが残る難所**。
- 出典: [Obsidian Forum: Canvas pinch zoom bug (Android)](https://forum.obsidian.md/t/canvas-pinch-zoom-bug-after-reopening-android/115895), [Obsidian Forum: Address Zooming Limitations in Canvas](https://forum.obsidian.md/t/address-zooming-limitations-in-canvas/93117)

#### ⑦ tldraw（無限キャンバスSDK）
- **時期**: 現在も活発開発（OSS、商用SDKとしても提供）。
- **モバイル対応**: マウス・タッチ・スタイラス・キーボードを単一コードパスで扱う設計。最近のアップデートで**「ダブルタップ&ドラッグでズーム」という片手向けジェスチャーを追加**（ピンチが二指必須である弱点への対処策として参考になる）。
- 出典: [tldraw.dev Features](https://tldraw.dev/features/composable-primitives/selection-and-transformation), [GitHub tldraw/tldraw](https://github.com/tldraw/tldraw)

#### ⑧ Muse（→ Allume に改称、2024年）
- **時期**: 2020年頃ローンチ、2023年秋に創業者含む主要チームが離脱、2024〜2025年に "Allume" へリブランド。
- **示唆**: **空間キャンバス型の「思考の道具」は商業的に持続困難**（同種のMilanote, Kinopio, Scrintalも収益化に苦戦している傾向）。ピボット後のAllumeは「大きなアイデアに飛び込む」という異なるコンセプトに変化しており、素の無限キャンバスからの路線変更が示唆的。
- 出典: [Adam Wiggins: Muse retrospective](https://adamwiggins.com/muse-retrospective/), [Allume公式](https://allume.com/)

#### ⑨ Kinopio
- **時期**: 現存・コミュニティ資金運営。
- **仕組み**: カード（ノード）を空間に置き、コネクタで結ぶ。**無料枠は100カードまで**という上限が示唆的（＝スケールしない前提の設計）。
- **示唆**: 200ノード規模はKinopioの実用上限に近い。無限キャンバス系ツールは「数百枚」を超えると事実上使われなくなる暗黙のスケール上限がある。
- 出典: [Kinopio公式](https://kinopio.club/), [GitHub kinopio-club/kinopio-client](https://github.com/kinopio-club/kinopio-client)

#### ⑩⑪ Heptabase / Scrintal / Milanote（モバイル制約の共通パターン）
- Heptabase: モバイルアプリは「閲覧・軽編集」止まりで、iPadでもホワイトボード編集やPDF操作に強い制限。「視覚的ツールはやはりPC/大画面向けに最適化されている」という設計側の自認が見える。
- Scrintal: **実用に足るモバイルアプリが存在しない**（ブラウザ版はもっさりして使い物にならないとの評）。
- Milanote: モバイルは「外出先での画像保存（キャプチャ）」用途に限定し、本格編集は非推奨という設計判断。
- **共通結論**: 無限キャンバス系プロダクトは軒並み「モバイルは劣化版 or 閲覧専用」という設計判断に落ち着いている。**片手モバイルで無限キャンバスの本格操作をさせる方向自体が業界的に筋が悪いという強いシグナル**。
- 出典: [Heptabase App Store reviews](https://apps.apple.com/us/app/heptabase/id6445801508?see-all=reviews&platform=iphone), [Scrintal Capterra reviews](https://www.capterra.com/p/216983/Scrintal/reviews/), [Milanote product page](https://milanote.com/product/moodboarding)

### 1-3. 地図メタファ / Focus+Context / 決定的レイアウト

#### ⑫ Google Maps の LOD（Level of Detail）ラベル密度制御
- **仕組み**: 各地物に「ランク」を付与し、表示するラベル面積が閾値を超えるまで順にラベルを追加する。ズームレベルごとに何を出す／隠すかを**手動でチューニングしたルールセット**として持つ（物理シミュレーションではない）。
- **なぜ効くか**: 「今のズームで見るべき情報量」を事前に人間がデザインしている＝**decluttering is designed, not computed dynamically from force**。
- **muninnへの示唆**: force-directedを避けるなら、Googleと同じ発想＝「タグ／MOC単位で"この画面には何を出すか"を静的ルールで決め打ちする」のが王道。
- 出典: [Google Design Medium: Prototyping a Smoother Map](https://medium.com/google-design/google-maps-cb0326d165f5), [Google Maps Platform Blog: Deeper map customization](https://cloud.google.com/blog/products/maps-platform/deeper-map-customization-zoom-level-customization-and-industry-optimized-map-styles)

#### ⑬ Voronoi Treemap（Balzer & Deussen, 2005）
- **仕組み**: 矩形ではなく多角形（Voronoi分割）で階層データを表現。**force-directedではなく反復緩和計算による決定的な非重複タイリング**。
- **なぜ効くか**: 面積比較（大小）で量を、隣接関係で階層を同時に読める。矩形treemapのアスペクト比問題を解消。
- **懸念**: 計算コストが高め、リアルタイム性が求められる操作には不向き（ビルド時計算なら問題なし＝muninnの静的ビルド運用と相性◎）。
- 出典: [Voronoi Treemaps (Konstanz大学)](https://graphics.uni-konstanz.de/publikationen/Balzer2005VoronoiTreemaps/index.html), [amCharts Voronoi Treemap demo](https://www.amcharts.com/demos/voronoi-treemap/)

#### ⑭ Furnas (1986) "Generalized Fisheye Views" と Degree of Interest (DOI)
- **仕組み（学術原典）**: `DOI(x) = 事前重要度(x) − focusからの距離(x)`。ユーザーの現在の焦点に近いものほど、また元々重要なものほど大きく／詳しく表示。
- **これが後続すべての focus+context 手法（fisheye menu, hyperbolic tree, macOS Dock）の理論的祖**。
- 出典: [ACM SIGCHI Bulletin: Generalized fisheye views](https://dl.acm.org/doi/10.1145/22339.22342), [George Furnas (Wikipedia)](https://en.wikipedia.org/wiki/George_Furnas)

#### ⑮ Inxight Star Tree（hyperbolic tree browser, Xerox PARC 1995→Inxight 1997）
- **考案者**: Lamping, Rao, Pirolli（Xerox PARC, CHI'95）。1997年 Inxight としてスピンオフ、Yahooディレクトリ（数百万カテゴリ）のブラウジングに実採用された実績あり。
- **仕組み**: 双曲空間上に木構造を均一に配置し、それを円形ディスプレイに射影。フォーカスノードは大きく中心に、周辺は指数的に縮小されるが**消えずに「見える」（focus+context）**。
- **なぜ効くか**: 「近くは詳細に、遠くは存在だけ分かる」というFurnasのDOI理論を2Dグラフ描画に具体化。全体を見失わない。
- **破綻点・現況**: 特許保護が強く（Xerox PARC特許）、オープン実装が育たなかった。商用のInxight自体は現在ほぼ姿を消しており、**技術的には筋が良いが特許とビジネスの都合で普及しなかった**という珍しい失敗パターン。学術的には放射状ツリー(radial tree)として非双曲版が今も使われる。
- 出典: [Hyperbolic browser for INXIGHT (図解)](https://www.researchgate.net/figure/Hyperbolic-Browser-for-INXIGHT-Web-site-INXIGHT-uses-its-Star-Tree-hyperbolic-browser-to_fig2_243771481), [Comparing Treemaps, ConeTrees, and Hyperbolic Trees (Shneiderman)](https://www.cs.umd.edu/~ben/papers/Shneiderman2011Innovation.pdf)

#### ⑯ macOS Dock の拡大鏡（magnification）効果
- **時期**: Mac OS X（2001年〜）から現存、**現在も標準搭載**。
- **仕組み**: カーソル位置からの距離でDockアイコンの拡大率を連続的に変化させる（近いほど大きく、なめらかに減衰）。Furnasのfisheye理論の1次元（線形配列）版の最も成功した実用化。
- **なぜ効くか**: 小さいターゲット（Fittsの法則的に押しにくいアイコン）を、狙う直前に拡大することでヒット率を上げつつ、常時は省スペース。
- **示唆**: **2Dの空間全体ではなく「1次元の帯・リスト」にfisheyeを適用する**のは実装が軽く、20年以上実用に耐えている数少ない成功例。
- 出典: [I Rebuilt the macOS Dock Magnify Effect (Medium)](https://dev48v.medium.com/i-rebuilt-the-macos-dock-magnify-effect-in-css-js-9fc2b9ec3b6a), [buildui.com: Magnified Dock](https://buildui.com/recipes/magnified-dock)

### 1-4. その他の参照事例

#### ⑰ 空間ハイパーテキスト研究: VIKI / Storyspace / Tinderbox
- VIKI（Cathy Marshall, Xerox PARC）は「明示的リンクなしで空間配置だけで意味を表現できるか」を検証した研究システム。Storyspaceは空間配置と明示的リンク線を**両方**表示するハイブリッド型（map view）。
- **現存するのはTinderbox/Storyspace（同一コードベース、macOSのみ）のみ**。ジャンルとして商業的には非常に小さい。
- muninnへの示唆: 「リンクだけでなく空間位置そのものに意味を持たせる」という発想の学術的源流。ただし**明示的リンク（wikilink）とは独立に空間位置を管理するのは運用コストが高い**（誰が位置を更新するかという問題）——muninnでは書き手（Claude Code）が位置管理までやると原則⑤の自動化コストに直結する。
- 出典: [Eastgate: Tinderbox FAQ](https://eastgate.com/Tinderbox/FAQ/who.html), [W(h)ither Spatial Hypertext? (2025)](https://dl.acm.org/doi/pdf/10.1145/3720553.3746683)

#### ⑱ method of loci（記憶の宮殿）のアプリ応用
- **未確認点が多い分野**: 検索した範囲では、2D/PWAでの実用UIパターンとして確立した成功事例は見つからず、VR/3D（Windows Mixed Realityの "Loci Memory Palace" 等）かAI画像生成を使った実験的プロトタイプが中心。**「間取り図に情報を配置して覚える」を素のWeb UIとして製品化した強い成功事例は未確認**。
- muninnへの適用は「効くはず」という認知科学的裏付け（空間記憶は言語記憶よりロバスト）はあるが、**具体的UIパターンとしての借用元は乏しい**——独自設計が必要な領域。
- 出典: [Method of loci (Wikipedia)](https://en.wikipedia.org/wiki/Method_of_loci), [iLoci (Don Hopkins記事)](https://donhopkins.medium.com/iphone-app-iloci-by-don-hopkins-mobile-dev-camp-6192ca6b5dcd)

#### ⑲ Minimap（ビデオゲームUI）
- **仕組み**: プレイヤー中心・円形・画面隅（左下率が多い）・実空間の2〜3%スケールで表示する、というデザインパターンがほぼ業界標準として確立（MDPI論文で実証分析あり）。
- **批判**: 近年のゲームデザイン論では「ミニマップは足場（scaffolding）であり松葉杖にすべきでない。人間は本来ランドマークと記憶で空間を把握するようできている」という反省が強い（Rethinking the Mini-Map論文）。
- **示唆**: 常時表示の小さな俯瞰図＋現在地インジケータは「今どこにいるか」問題の枯れた解だが、**過度に依存させると自前の空間把握（＝定着）を阻害する**という副作用がある。muninnの「想起・定着」という目的とは相性に注意が必要。
- 出典: [MDPI: Mini-Map Design Features as a Navigation Aid](https://www.mdpi.com/2220-9964/12/2/58), [Rethinking the Mini-Map (T&F)](https://www.tandfonline.com/doi/abs/10.1080/10447318.2017.1418804)

#### ⑳ BumpTop（物理デスクトップメタファ）
- **時期**: 2007年発表〜2010年Google買収で製品終了。
- **仕組み**: ファイルを物理的な紙のように積み重ね・投げ飛ばし・ピン留めできる3Dデスクトップ。
- **示唆**: 空間メタファを「物理法則」まで踏み込むと話題性は出るが、実務ツールとしては短命（3年で終了・買収後供養）。**物理シミュレーションに寄せすぎたスペーシャルUIは長続きしない**という否定例。
- 出典: [BumpTop (Wikipedia)](https://en.wikipedia.org/wiki/BumpTop), [TechCrunch: Google Acquires BumpTop](https://techcrunch.com/2010/05/02/bumptop-possible-google-acquisition/)

---

## 2. 分野から抽出できる原理（6個）

1. **「ズームは移動手段であってナビゲーションの答えではない」（Zoom is not navigation）** — Pad++以降の実証研究、Prezi批判、Windows8批判すべてが同じ結論に収束する。ズームだけを頼りにすると「今どこにいるか」を見失う。**必ず不変のランドマーク（固定ラベル・固定順路）を併設する必要がある**。
2. **Focus+Context ＞ Zoom単体** — Furnasの DOI理論、hyperbolic tree、macOS Dockに共通するのは「焦点は詳細に、それ以外も完全には消さず存在を示す」という設計。ズームイン/アウトで情報を"消す"のではなく"縮退させる"方が迷子にならない。
3. **決定的レイアウトは「物理シミュレーション」ではなく「事前設計されたルール」で作るのが王道** — Google MapsのLODも、Voronoi Treemapも、radial treeも、force-directedのような動的収束計算ではなく、階層・ランク・順序という**離散的な入力から一意に座標を導出する関数**。muninnの「決定的」原則と完全に一致する方向性。
4. **無限キャンバス＋モバイル本格編集の組み合わせは業界的に見送られている** — Obsidian Canvas・Heptabase・Scrintal・Milanote、いずれも「モバイルは劣化版か閲覧・キャプチャ専用」という設計判断に収束している。**muninnが読み専用アプリである点はむしろ有利**（編集の複雑さを最初から持たない）。
5. **空間の効能は"数百アイテムの一望"ではなく"数個〜十数個の定位置化"に宿る** — Kinopioの無料枠100枚上限、muninnの既存原則「12点まで」、Dockの拡大鏡が対象とする「並んだ十数個のアイコン」——いずれも空間記憶が効くのは対象が少数のときであり、200ノード全部を1枚の地図に収めようとする発想自体が過去の失敗（Pad++, ZoomWorld, hairball）の再演になりやすい。
6. **モバイルのピンチジェスチャーは二指前提であり、片手操作の"定石破壊"を狙うUIとは原理的に矛盾する** — tldrawが「ダブルタップ&ドラッグ」という片手代替ジェスチャーをわざわざ追加した事実、Eagle Modeがデスクトップ専用に留まっている事実が示す通り、**ピンチズームに依存する空間UIは、この案件が最優先する片手操作という制約と正面衝突する**。

---

## 3. muninnへの適用案（5つ、ボツ理由つき）

### 案A: 「都市地図」型の固定ズームレベル・ホーム画面（Google Maps LOD方式）
- 内容: MOC（束）を「都市」、記事を「建物」に見立て、3段階の固定ズームレベル（①タグ大陸→②MOC地区→③記事番地）を**手動でチューニングした静的SVG/Canvas**として用意する。各レベルで出すラベル数を事前に決め打ち（Googleと同じ発想）。ズームは指でピンチではなく**タップでレベル遷移**（ピンチ操作を要求しない）。
- ボツ理由: 90記事・20タグ規模で3階層の"地図"を維持するメンテコストは高い。新規ノート追加のたびに「地区のどこに置くか」を決める設計判業務が発生し、Claude Code側の記録フローに新しい非自明な作業（座標決定）を追加してしまう。**正本はmarkdownという原則と衝突しやすい**（座標が新たな正本情報になってしまう）。

### 案B: 決定的グリッド＋Furnas型 DOI ソート（force-directedを避けつつ空間的に見せる）
- 内容: ノードをforce-directedで動かすのではなく、**タグ×更新日で決定的にグリッド配置**（行=タグ、列=時期など）した上で、現在のフォーカス（今開いている記事）からのリンク距離でセルの見た目の大きさ・濃さをFurnasのDOI関数で連続的に変える。ピンチズーム不要、スクロールのみ。
- ボツ理由: グリッドの行×列の意味づけ（タグ×時期）が対象範囲を選ぶ人によって直感的でない可能性がある。またDOI計算（リンク距離）をクライアントJSでやるかビルド時にやるかの設計が要る。実装コストは中程度だが「地図」感が薄く、単なる装飾ヒートマップに見えるリスクがある。

### 案C: macOS Dock方式の「1次元fisheyeレール」を主要ナビゲーションに採用
- 内容: 2D空間全体を再現するのではなく、**MOC一覧や最近リンクした記事列を横一列の"レール"として並べ、指の位置（スクロール位置）に応じて中央のカードだけ拡大表示するfisheyeリスト**にする。片手の親指スワイプだけで完結し、ピンチ不要。
- ボツ理由: これは「空間UI」というより「拡張されたリスト」であり、団体としては地味。「他にない、尖ったUIUX」という要求に対してインパクトが弱く、見た目の刷新効果が小さい可能性がある。

### 案D: 「12点の定位置カード」を毎回同じ座標に描く"星座"ビュー（決定的レイアウト・DOIなし版）
- 内容: 各MOC/学習アトラスごとに、その配下の代表12ノードを**ハッシュ由来の固定座標**（例: タイトル文字列からシード生成→円周上に均等配置、または放射状ツリーで階層1段だけ表示）に描く。ズーム操作を要求せず、タップでその場に詳細を展開（アコーディオン的）。「同じ場所に同じノードが毎回描かれる」という既存原則をそのまま座標決定アルゴリズムに落とし込む。
- ボツ理由: 12点を超えるノードを持つMOCでは代表12点をどう選ぶか（アルゴリズム的優先順位付け）の設計が追加で必要。また放射状に固定した場合、モバイル縦長画面での視認性（円が縦長画面に収まりにくい）を別途検証しないといけない。

### 案E: Hilbert曲線による「タイムライン×トピック」の決定的1次元マッピング
- 内容: 200ノードを1本のヒルベルト曲線（または単純なジグザグのブロック配置）上に、作成日順または更新頻度順で並べ、**同じデータなら常に同じマス目に落ちる**決定的な"ドットマップ"を作る（GitHubのcontribution graph的な発想の拡張）。タグは色で表現。タップで展開。
- ボツ理由: ヒルベルト曲線特有の「近傍性」の恩恵は数千〜数万要素のデータでこそ効くもので、200要素では単純なグリッド・年表と体感差がほとんどない。**実装の目新しさに対して体験上の利得が薄く、コスパが悪い**（原理5「少数では空間の効能が薄い」の裏返し）。

---

## 4. Web(PWA)実装の技術的勘所

- **SVG vs Canvas**: ノード数が200以下・DOM操作（タップでハイライト、CSSトランジション）を多用するなら**SVG一択**。Canvasは大量描画（1000+）や毎フレーム再描画が必要な物理シミュレーション向けで、muninnの規模・要件（決定的レイアウト・force-directed不使用）とは相性が悪い。SVGなら`prefers-color-scheme`のダーク固定CSSやグラス系のfilter/backdrop-filterもそのまま使える。
- **片手でのズーム代替**: ピンチズームを主要操作にしない。代替として (a) tldraw方式の「ダブルタップ+ドラッグ」、(b) ボタン/セグメントコントロールでの明示的ズームレベル切り替え（Google Maps LODの発想）、(c) スクロール位置に連動する疑似fisheye（transform: scale をスクロール位置から算出、Dock方式）のいずれかが片手親指操作と両立する。**ピンチジェスチャーは二本指前提なので、この案件のPWA要件（片手）とは原理的に不整合** — 実装するとしても補助手段に留める。
- **決定的レイアウトの計算方法**:
  - 文字列（ファイル名・タイトル）から決定的なシード値を作る（例: 簡易ハッシュ関数）→ 疑似乱数の代わりに使うことで「毎回同じ座標」を保証しつつ見た目に自然なばらつきを出せる。
  - 階層データ（MOC→記事）は radial tree（極座標: 半径=階層深さ、角度=兄弟内の決定的な順序（作成日やalphabetでソート））で一意に座標を計算できる。三角関数だけで済み、force-directedのような反復収束計算が不要＝ビルド時に静的座標をJSONに焼き込める。
  - Voronoi treemapは反復緩和計算が必要でビルド時計算向き（クライアントでの動的再計算は避ける）。muninnは`build-data.mjs`でビルド時に`site.json`を生成する構成のため、座標計算をここに寄せるのは既存アーキテクチャと自然に合致する。
  - fisheye/DOI（Furnas式）は「現在のフォーカスからの距離」という実行時に決まる値に依存するため、**座標そのものは決定的に固定し、DOIは"見た目のスケール・不透明度"にだけ効かせる**という分離が重要（原則②「レイアウトは決定的」を守りながらfocus+contextの効能を取り込む唯一の方法）。
- **アニメーション負荷**: iPhone Safari PWAでの60fps維持には、transformとopacityのみをアニメーションさせ（GPU合成レイヤー）、width/height/layoutプロパティのアニメーションは避ける（macOS Dock再現記事でも同じ指摘）。
- **オーバービュー（ミニマップ）を足す場合の注意**: ゲームUI研究が警告する通り、常時表示のミニマップは便利だが「自前の空間記憶の形成を妨げる」副作用がある。muninnの目的が「想起・定着」である以上、ミニマップは常時表示ではなく**任意で呼び出すオーバーレイ**に留める方が目的と整合する。

---

## 未確認・要注意事項
- method of loci の2D/Web UIとしての確立した成功事例は発見できず（VR系プロトタイプのみ確認）。muninnで採用する場合は先行事例のない独自設計になる。
- Windows 8 semantic zoom単体の失敗/成功の切り分けは、Start Screen全体への反発と混同されており一次資料でも明確に分離されていない（機能自体への直接批判は確認できず、示唆に留まる）。
- Inxight Star Treeの正式な終了時期・理由（特許問題以外の事業要因）は一次情報で確認できず、示唆止まり。
