# 05 — エディトリアル／実験的Webデザイン・デジタル組版・尖った表現

muninn（個人ナレッジベース閲覧サイト、React+Vite/PWA、ダークグラス、下タブ4つ＋縦スクロールカードリスト）を「定石的なモダンスマホアプリUI」から脱却させるための参考調査。担当領域: エディトリアル/実験的Webデザイン、デジタル組版、ブルータリズム、日本語組版、モノスペース/ターミナル美学、情報密度設計。

---

## 1. 具体例（8件以上）

### 1-1. NYT "Snow Fall: The Avalanche at Tunnel Creek"（2012, 現存）
- URL: nytimes.com/projects/2012/snow-fall/
- **表現**: 記事本文の縦スクロールに合わせて、フルブリードの動画・アニメーション地形図・写真が"クリック不要"でトリガーされる長文ドキュメンタリー記事。既存の「記事＋サイドの動画埋め込み」という型を破り、テキストとマルチメディアを一体の組版として設計した。
- **最適化/強調**: 長文ジャーナリズムの没入感。読者を止めずに一つの物語として最後まで運ぶこと。
- **なぜ効くか**: スクロール＝ページめくりの比喩を徹底し、操作の学習コストをゼロにしたまま情報の密度と迫力を上げた。公開後6日で290万訪問・350万PVを記録し、2012年ジョージ・フォスター・ピーボディ賞を受賞（[Poynter](https://www.poynter.org/reporting-editing/2012/how-the-new-york-times-snow-fall-project-unifies-text-multimedia/), [Wikipedia](https://en.wikipedia.org/wiki/Snow_Fall)）。
- **破綻/批判**: 業界で"snowfalling"という動詞が皮肉交じりに定着したほど、あらゆる記事にこの重量級パララックス演出を後付けする模倣が量産され、「内容に見合わない過剰演出」「モバイルでの読み込み負荷」が批判された（[Creative Bloq](https://www.creativebloq.com/web-design/snowfall-51411702)）。制作コストも桁違いに高い。

### 1-2. Bloomberg Businessweek（2010年 Turley/Schwartz改革、現存だが2017年に路線変更）
- URL: bloomberg.com/businessweek
- **表現**: 2010年、編集長Josh Tyrangielとクリエイティブディレクター Richard Turley が、既存書体 Neue Haas Grotesk のデジタル復刻をタイポグラファ Christian Schwartz に依頼し完成させ、極太見出し・原色の色面・インフォグラフィック多用の"うるさいが機能する"エディトリアルデザインへ刷新（[Commercial Type](https://commercialtype.com/custom/bloomberg_businessweek)）。
- **最適化/強調**: 誌面ごとに"重み"を変える自由度。ニュースの重要度に応じてレイアウトのトーンをその都度作り変える"モジュール型"の紙面思想をWebに持ち込んだ（[Nieman Lab](https://www.niemanlab.org/2015/01/bloomberg-business-new-look-has-made-a-splash-but-dont-just-call-it-a-redesign/)）。
- **なぜ効くか**: 均質なテンプレートに縛られず、記事の性格（速報/分析/特集）ごとに組版のルールを変えることで「読み物としての抑揚」を作れる。
- **破綻/批判**: 当初は「けばけばしい」「悪趣味」と賛否両論を呼んだ（polarizing）。2017年の再設計では過激な作り込みを捨て、より落ち着いたトーンに回帰しており、"尖りすぎ"の持続可能性に限界があったことを示唆する（[It's Nice That](https://www.itsnicethat.com/news/bloomberg-businessweek-redesign-rob-vargas-creative-director-160617)）。

### 1-3. Bloomberg Graphics「What's Really Warming the World?」（2015, 現存）
- URL: bloomberg.com/graphics/2015-whats-warming-the-world/
- **表現**: NASA GISSの気候モデルを使い、スクロールに応じて「太陽・火山・エアロゾル・温室効果ガス」を1要因ずつ足し引きしながらグラフが変化する説明型スクロールテリング。絵本『Where's Spot?』を参照点に、専門的な気候科学を"仕掛け絵本"の operant に翻訳した（データ元: NASA GISS ModelE2、[Data Stories podcast](https://datastori.es/behind-the-scenes-of-whats-really-warming-the-world-with-the-bloomberg-team-ds59/)）。
- **最適化/強調**: 「1グラフ＋1要因」の反復構造で、複雑な因果を段階的に理解させる。派手な演出より論証の順序に投資している。
- **なぜ効くか**: 軽量な `graph-scroll` ライブラリでスクロール位置とデータ系列の表示/非表示を同期させるだけの実装であり、WebGL等を使わずに説得力を出している。
- **破綻/批判**: 記事単体の制作コストが高く、日常的な更新記事には転用できない"一点豪華主義"のフォーマット。

### 1-4. The Pudding（2017年創刊, 現存）
- URL: pudding.cool
- **表現**: 「文章より可視化で語る」を掲げるデータジャーナリズム媒体。D3.js＋Svelteで自作の可視化を大量生産し、1記事＝1つの実験的インタラクションという単位で公開（[Storybench](https://www.storybench.org/pudding-structures-stories-visual-essays/), [Wikipedia](https://en.wikipedia.org/wiki/The_Pudding)）。
- **最適化/強調**: 「visual essay」という単位そのもの。長文の代わりにインタラクションで読ませ、通読時間を圧縮しながら発見の快楽を残す。
- **なぜ効くか**: 記事ごとにビジュアル言語をゼロから設計し直す姿勢が、量産型テンプレートにない"驚き"を生む。2017年Peabody賞、2023年Online Journalism Award受賞（[Peabody Awards](https://peabodyawards.com/award-profile/the-pudding/)）。
- **破綻/批判**: 記事ごとに作り込みが違うため保守コストが高く、個人開発規模では模倣困難。モバイルでのインタラクション（ドラッグ/ホバー多用）が読み専用の片手操作とは相性が悪いものもある。

### 1-5. The Marginalian（旧Brain Pickings, 2006年〜, 現存）
- URL: themarginalian.org
- **表現**: 実際に本文フェッチで確認したところ、本文はセリフ体、見出しはサンセリフの階層構造、単一カラムで記事プレビューが縦にカスケードする構成。広告ゼロ、装飾ゼロ、著者名（Maria Popova）だけを繰り返し明示する編集的誠実さが特徴。ページネーションは「page 1 of 1,666」のように総量を隠さず提示する（本レポート作成時点でのWebFetch確認）。
- **最適化/強調**: 15年以上の蓄積を「隠さず見せる」こと。物量そのものを信頼のシグナルとして使っている。
- **なぜ効くか**: 過剰な演出をゼロにすることで、逆に「これだけの物量を一人が書き続けている」という事実が際立つ。個人運営の知識蓄積サイトとして muninn に近い性質を持つ数少ない実例。
- **破綻/批判**: 単一カラムの縦スクロールに終始しており、"紙面"的な組版の工夫はほぼない。物量を武器にする戦略は蓄積が薄い状態では機能しない。

### 1-6. brutalistwebsites.com（2016年〜, 現存・アーカイブ的キュレーション）
- URL: brutalistwebsites.com
- **表現**: 実際にフェッチして確認したところ、サイト自身の定義は「今日のWebデザインの軽さ・楽観性・軽薄さへの若い世代による反動としてのブルータリズム」。掲載例には RAW Magazine、Yves Tumor "Safe In The Hands of Love"、Stedelijk Museum Amsterdam、School for Poetic Computation、Supreme、LOW←TECH MAGAZINE などが並ぶ（本レポート作成時点でのWebFetch確認）。共通項は「デフォルトのブラウザレンダリングに近い荒さ」「装飾より構造の露出」。
- **最適化/強調**: 商業的な"心地よさ"の拒否。情報の骨格をそのまま見せる誠実さ。
- **なぜ効くか**: 過剰な装飾がない分、初回ロードが軽く、記憶に残る（凡庸なデザインの海の中で異物として機能する）。
- **破綻/批判**: 一般ユーザーへの学習コストが高く、アクセシビリティ（コントラスト・操作アフォーダンス不足）を犠牲にしがちという批判が定番的にある（[Webflow](https://webflow.com/blog/10-brutalist-websites), [Wix](https://www.wix.com/blog/brutalist-websites)）。

### 1-7. This Is a Motherfucking Website（2013年頃〜, 現存）
- URL: motherfuckingwebsite.com
- **表現**: HTMLとほぼ生のブラウザデフォルトスタイルのみで構成された、過激な物言いのマニフェスト兼実例サイト。jQuery UIや複数書体、装飾アニメーションといった"重さ"を持つ現代のWeb習慣を痛烈に批判する（[Hacker News議論多数](https://news.ycombinator.com/item?id=6791297)）。
- **最適化/強調**: ロード速度・アクセシビリティ・レスポンシブ性を「何もしない」ことで達成する。
- **なぜ効くか**: ブレークポイントもフレームワークも不要で、あらゆるビューポートに"応答"する。テキストベースのナレッジベースにとって、最も安価に到達できる"尖り"の下限値を示す good reference。
- **破綻/批判**: 表現の幅がゼロに近く、情報の階層化・強弱付けができない。muninnのような「今日の面」の演出には向かない（そのまま採用すると"紙面"の魅力を失う）。

### 1-8. Tufte CSS（edwardtufte.github.io/tufte-css, 現存, オープンソース）
- **表現**: Edward Tufteの印刷物向けデザイン原則（sidenotes、epigraph、figure配置）をWeb向けCSSとして翻案したスタイルシート。実際にフェッチして確認: オフホワイト(#fffff8)/オフブラック(#111111)の低コントラスト配色、ETBook（Monotype Bembo代替の書体）、見出し階層をh1〜h3の3段に制限、注釈をチェックボックス＋labelでサイドノート化（大画面はマージンに常時表示、小画面はトグル）。
- **最適化/強調**: 「本文を邪魔しない注釈」「印刷を模倣するのではなくWebに翻案する」という一次資料へのリンクをテキストと同じ視覚的重みで並置する思想。
- **なぜ効くか**: 情報密度（本文＋注＋図）を上げながら、視線移動を最小化する。ページ内リンク色を本文色＋下線に統一し、視覚的ノイズを削っている。
- **破綻/批判**: サイドノートはモバイル幅では折りたたみUIに変わり、"marginalia"の空間的魅力が失われる。muninnの片手スマホ利用が主戦場である以上、そのままの移植は効果が薄い。

### 1-9. Bloomberg Terminal（1980年代〜, 現役・非Web）
- **表現**: 80x25セル基準の黒背景・単色高密度レイアウトが数十年間ほぼ不変。マウスよりキーボードショートカット中心（[Bloomberg公式](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/)）。
- **最適化/強調**: 「一目で全部見せる」ことと「思考の速度で操作できる」こと。消費者向けの心地よさより専門家の生産性を優先。
- **なぜ効くか**: 情報密度＝信頼のシグナルという逆説（トレーダーは"スカスカな画面"を信用しない）。2026年時点でも「Dense Interfaces Are Back」という論考が出るほど、ミニマリズム一辺倒への反動として再評価が進んでいる（[MyDesigner Blog](https://mydesigner.gg/blog/dense-interfaces-information-hierarchy-2026)）。
- **破綻/批判**: 学習曲線が非常に急。読み専用の個人アプリでこの密度をそのまま真似ると、日次利用のハードルを上げてしまう。

### 1-10. ターミナル/モノスペース系ポートフォリオ（2023〜2026年トレンド, 多数現存）
- 例: Kuberwastaken のポートフォリオ（[GitHub](https://github.com/Kuberwastaken/Kuberwastaken.github.io)）、12.8KBのターミナル風ポートフォリオ（[DEV Community](https://dev.to/cod-e-codes/how-i-built-my-128-kb-terminal-themed-portfolio-site-and-template-52om)）。
- **表現**: ダーク背景＋モノスペースフォント（Berkeley Mono、IBM Plex Mono等）で、1987年のターミナルを模したUI。Figletライブラリ等でASCIIアートの見出しを生成。
- **最適化/強調**: 制約（固定幅グリッド・単一書体）をむしろ創造的自由と捉える"ビルダー文化"の記号。
- **なぜ効くか**: 依存ゼロ・スタイルシート最小で実装できるため、パフォーマンスと美学が一致する（[EZASCII Blog](https://ezascii.com/blog/the-comeback-of-console-aesthetics-and-ascii-art)）。
- **破綻/批判**: サブカルチャー色が強く、非エンジニア層には「読みにくい/古臭い」と映るリスク。日本語との相性（等幅フォントは和文グリフの品質・カバレッジが弱いものが多い）も要検証。

---

## 2. 分野から抽出できる「原理」

1. **組版＝情報の重み付け装置**（Snow Fall, Businessweek）: フラットなカードリストは全記事を同じ重要度で提示してしまう。紙面は「今日の一番」「小さい扱い」を視覚的サイズ・位置で先に伝える。段の存在自体が編集判断の可視化になる。
2. **密度は敵ではない、無編集な密度が敵**（Bloomberg Terminal, Tufte）: 情報を減らすのではなく、視線移動を減らす設計（サイドノート、スパークライン、small multiples）によって「多いのに読める」を実現する。
3. **制約の誠実な露出が"軽さ"と"個性"を同時に生む**（Motherfucking Website, brutalistwebsites.com, Terminal Aesthetic）: 装飾を削ぎ落とすほど、パフォーマンスと記憶への刺さり方の両方が向上する。ただし表現の幅（強弱づけ）を失うトレードオフがある。
4. **反復構造による段階的説得**（Bloomberg "Warming the World"）: 1画面1変数の反復は、WebGLなしでも説得力のあるインタラクションを作れる。
5. **量そのものを可視化すると信頼になる**（The Marginalian）: 蓄積型の個人メディアでは、演出より「何年何本続けているか」を隠さず見せることが最大の説得力になりうる。
6. **地域固有の組版文法は差別化の武器になる**（日本語縦書き・ルビ・禁則、後述）: グローバルなテンプレートを捨て、対象言語の組版規範を主役に据えることで、他にない体験になる。

---

## 3. muninn への適用具体案（5つ、ボツ理由つき）

### 案A: 「今日の面」を段ごとに異なる組版密度で描く（CSS Gridの複合グリッド）
- 内容: リード記事＝大きな1カラム見出し＋本文冒頭、再読カード＝Tufte的sidenote風の小さめカード列、連載＝横スクロールの帯、在庫＝小さなテキストリンクの密集リスト、という具合に**段ごとにグリッドの粒度を変える**（`grid-template-columns` を段単位で切り替える）。Businessweekの「記事の重要度でモジュールを変える」思想の直輸入。
- **ボツになりうる理由**: 実装・保守コストが「均一カードリスト」より確実に上がる。段の種類が増えるたびにCSSパターンが増殖し、Vite/Reactのコンポーネント設計が複雑化するリスクがある。

### 案B: 日本語の武器（縦書き・明朝/ゴシック対比・ルビ）を"リード記事の見出し"だけに限定投入
- 内容: 毎日変わる「今日の一番」記事の見出しだけ `writing-mode: vertical-rl` の縦組みにし、本文は横書き明朝、見出しはゴシックで対比させる。既存ノートに `title` はあるがルビは無いため、まずは書体対比と見出しの縦組みのみ。
- **ボツになりうる理由**: iPhone片手操作でのスマホ横幅に対して縦書きブロックは横方向に伸びるため、狭い画面では逆にスクロール方向が矛盾し、UXを混乱させる可能性がある（縦書きは"見出しだけ・短い"という制約を厳守しないと破綻する）。

### 案C: Tufte式サイドノートを「関連ノートへのリンク」に流用
- 内容: 記事本文中の `[[wikilink]]` を、本文右マージン（デスクトップ）/ 本文直下の折りたたみ（モバイル）に出すサイドノート化する。現状リンクは本文内インラインだが、これを「思考の脇道」として視覚的に分離する。
- **ボツになりうる理由**: muninnの主戦場はモバイル片手操作であり、Tufte CSSのサイドノート自体、狭い画面では結局トグルUIに退化して"marginalia"の魅力が消える（1-8で指摘済みの弱点がそのまま当てはまる）。実装対効果が低い可能性。

### 案D: ターミナル/モノスペース質感を「デスク（探す/検索/メタ画面）」限定で採用
- 内容: 4タブ中「デスク」タブ（依頼票を作る・検索するなど機能的な面）だけをモノスペースフォント＋コマンドライン風UIにし、記事を読む面（面/棚）はエディトリアル体裁を維持する。機能面と読み物面でトーンを切り替える。
- **ボツになりうる理由**: アプリ内でトーンが割れ、「一貫した紙面」というブランドが崩れる。ユーザーが「今どの面にいるか」をフォント切り替えで毎回意識させられてしまい、CLAUDE.mdの「今どの機能を使っているか意識せずに済む」という統一入口思想と矛盾する。

### 案E: 「物量の可視化」をホーム/棚に導入（The Marginalian型）
- 内容: 記事数(~90本)・アトラス章数・フォロー観測回数などの蓄積量を、装飾なしで数字そのまま提示するフッターまたはヘッダー要素を常設する（例: 「note 92 / atlas 7 / session 214」のような一行）。
- **ボツになりうる理由**: 個人の蓄積量を常に見せることは動機づけにはなるが、"紙面"のメタファーとは無関係な"進捗バー"的UIに寄りがちで、コンセプトのブレを生む可能性がある。導入するなら「デスク」面などメタ情報向けの場所に限定すべき。

---

## 4. Web(PWA)で再現する際の技術的な勘所

### CSS Gridでの紙面組版
- `grid-template-areas` で段（リード/再読/連載/特集/記録/在庫）を名前付きエリアとして定義し、**在庫が無い段はエリアごと `display: none` にしてグリッドを再フロー**させる（`grid-template-areas` を状態ごとに複数用意し、JSでクラス切り替えが軽量）。
- `grid-auto-flow: dense` は「隙間を自動で埋める」ため一見便利だが、**DOM順とビジュアル順が乖離し、スクリーンリーダー/フォーカス順が崩れる**。読み専用サイトでもキーボード操作やVoiceOverのローターは考慮すべきで、`dense` を使うなら `order` の乱用を避け、視覚順とDOM順の対応表を設計段階で明文化する必要がある（[freefrontend](https://freefrontend.com/css-magazine-layouts/), [MDN Masonry](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Masonry_layout)）。
- CSS Gridのネイティブ`masonry`値は2025年時点で仕様策定中・実験的（Safariのみ先行実装の系譜）であり、Chrome安定版での本番採用はまだ避けたほうが無難。`grid-auto-flow: dense` か JS計算のfallbackで代替するのが現実的。

### writing-mode の落とし穴
- `writing-mode: vertical-rl` は2017年以降主要ブラウザで安定しているが（[W3C](https://www.w3.org/International/articles/vertical-text/)）、**縦組み内での欧文・数字・URL・コードスニペットの扱いが最大の罠**。`text-orientation: mixed` で漢字仮名は縦のまま欧数字だけ横倒しにできるが、muninnのノートは`[[wikilink]]`や英語の技術用語（React、CSS等）を本文に多用するため、縦組みにすると英数字の可読性が大きく落ちる。**縦組みの適用範囲は見出しなど短い和文だけに限定すべき**というのが上記案Bの制約理由そのもの。
- 縦組み時のスクロール方向が「横方向」になる点もモバイルでは注意。`overflow-x` の扱いを誤ると横方向ページネーションと縦方向スクロールが同時発生し、iOSのSafariでは特にスクロールの主導権の奪い合いが起きやすい。

### フォント読み込みコスト（日本語固有の最大の技術課題）
- ラテン文字は200〜300グリフで済むが、**日本語対応フォント（Noto Sans/Serif JP等）はフル収録で16MB前後、17,000グリフ超**になる（[font-converters.com](https://font-converters.com/languages/cjk-font-optimization)）。全グリフ収録のままWebフォント化するのは論外。
- 対策は次の3段構え: ① **サブセット化**（実際に本文で使う文字だけを収録。ビルド時に全notes/atlas本文を走査して使用文字集合を確定し、その文字だけのサブセットフォントを生成する。muninnはmarkdownソースが正本なので、ビルドスクリプト側でこれをやるのが最も筋がいい）、② Google Fonts等の`text=`パラメータによる動的サブセット配信、③ 見出し用と本文用でウェイトを絞り、可変フォント(variable font)は「複数ウェイトを本当に使う場合のみ」採用（1ウェイトしか使わないなら静的サブセットの方が軽い）。
- 明朝/ゴシックの対比を導入する場合、**2書体×必要ウェイト分のサブセットを毎回ビルドし直す**運用コストが発生する点は事前に見積もっておくべき。

### CSSのみで作れる質感
- リソグラフ/ざらつき質感は `mix-blend-mode: multiply` の色面レイヤー2〜3枚＋SVG `feTurbulence` によるノイズマスク＋1〜3pxの版ズレ(misregistration)オフセットで再現可能。軽量なCSSユーティリティとして `risograph.css`（約3KB）という実例が既に存在する（[Osman's Workshop](https://osmanyy.com/projects/risograph-css/)）。JSやWebGL無しで質感だけ変えられるため、muninnの「ダークグラス以外の質感」候補として最も導入コストが低い。
- ただし `mix-blend-mode` はブラウザ間で微妙にレンダリング差があり、フォールバック（非対応環境ではフラットカラー）を明示的に用意する必要がある。

### prefers-reduced-motion / 軽量スクロール演出
- 新しい `animation-timeline: scroll()` / `view()` はChrome 115+/Safari 26+（2025年9月〜）が前提で、iOS Safariの実配布バージョンに依存するため、**muninnのようなiPhone中心PWAでは現時点で本命にしにくい**（[WebKit Blog](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/)）。
- 実務的な軽量代替は `IntersectionObserver` + `position: sticky` + `transform`/`clip-path` の組み合わせで、Safari含む全モダンブラウザで動く。
- どちらの方式でも **`@media (prefers-reduced-motion: reduce)` で「動きなし・完成形を即表示」にフォールバックする実装を必須にする**（[Codrops](https://tympanus.net/codrops/2024/01/17/a-practical-introduction-to-scroll-driven-animations-with-css-scroll-and-view/)のガイドが示す標準パターン）。

### 日本語組版の細部（禁則・ルビ）
- 行頭禁則（行頭に句読点・小書き仮名を置かない）はCSSの `line-break: strict` で強められるが、日本語の事実上の標準は「loose」（行頭に小書きカナが来ても許容）で、書籍・雑誌・新聞の大半がloose側。**`line-break: strict` をむやみに指定すると、かえって"見慣れない"改行になる**ため、指定しない（ブラウザ既定＝loose相当）のが無難（[W3C I18N](https://www.w3.org/International/tutorials/css3-text/en/all)）。
- ルビ(`<ruby><rb>漢字</rb><rt>かんじ</rt></ruby>`)はモダンブラウザで実装済みだが、muninnのnotes本文はmarkdown正本のため、ルビを使うなら**ビルド時にmarkdown拡張記法からruby要素へ変換する前処理**が必要になる（正本を汚さない、というCLAUDE.mdの原則に抵触しないよう、あくまで表示用ビルドの変換に留める）。

---

## 未確認・要注意事項
- Balenciaga/Yeezyの"極端なWebデザイン"の具体的な演出（404ページ、テキストのみ構成等）については、検索で断片的な言及は得られたが一次情報での仕様確認はできなかった。**未確認**として扱い、具体例からは除外した。
- Jack Dorseyの個人サイトの実在・具体的なデザインは検索で特定できず、**未確認**のため本レポートの具体例からは除外した。
- Berkeley Mono（US Graphics製、開発者Neil Pachal、2.0版あり）はモノスペース系の代表フォントとして情報を確認できたが、和文グリフを持たないラテン専用フォントである点に注意（[usgraphics.com](https://usgraphics.com/products/berkeley-mono), [neil.computer](https://neil.computer/notes/introducing-berkeley-mono/)）。
