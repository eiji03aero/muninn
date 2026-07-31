# 想起（間隔反復）のUX設計 — 事例調査レポート

対象課題: muninn の `kind: knowledge` 59本が**全件復習期限切れ**（review-log実質停止）という「詰んだ在庫」を、
静的サイト＋localStorage影SRS＋伝票方式でどう毎日の数枚に切り出し、ループを再始動させるか。

---

## 1. 具体例（8件+）

### 1-1. Quantum Country / mnemonic medium（Andy Matuschak × Michael Nielsen, 2019〜／現在も公開中）
- **仕組み**: 量子計算の解説エッセイの**本文中に**間隔反復の問いを埋め込む。読了後、メール通知で数日〜数ヶ月おきに戻ってきて短い復習セッションをする。「読む」と「覚える」を同じ流れに統合し、モード切替を作らない。
- **削ったコスト**: 「別アプリでカードを自作する」手間。カードは著者が本文に沿って**先回りで書く**ので読者はゼロ手間。
- **効いている理由・実測値**（"How can we develop transformative tools for thought"より）:
  - 6回の復習サイクル後、112問平均で**約54日の実証済み保持期間**（1回目復習直後は約2日→6回目で54日、指数的に伸びる）。追加投資時間は初回4時間の読了に対し**約95分＝50%未満のオーバーヘッド**。
  - 公開6ヶ月後、**195人のユーザーが「カードの80%以上で1ヶ月の保持を実証」**。
  - 2週間の復習遅延実験: 予定通り復習した群は正答率89%→96%に向上、**復習を先延ばしにされた群は91%→87%に低下**。「規則的に復習した100%のユーザーで成績が維持または向上」。
- **限界・批判（著者自身が明言）**: 表面的パターン認識に陥るユーザーがいる／文脈から浮いた「孤児カード」は効果が薄い／良い問いを書くスキルの壁が高く、読者自身がカードを自作するのは困難。Matuschak自身「記憶は理解のごく一部に過ぎない」と明言し、創造的関与や競合する解釈の育成はカバーしないと認めている。
- 出典: [Quantum Country](https://quantum.country/qcvc), [How can we develop transformative tools for thought](https://numinous.productions/ttft/), [Mnemonic medium (notes)](https://notes.andymatuschak.org/Mnemonic_medium)

### 1-2. Orbit（Andy Matuschak, 2020〜 実験継続中）
- **仕組み**: mnemonic mediumを汎用プラットフォーム化。Webページを読みながらインラインで復習プロンプトを書ける（Hypothes.is / Obsidian連携）。Patreon支援の研究プロジェクトで、プロダクトではなく「思考の道具」の研究母体という位置づけ。
- 現状: 研究段階、方向性はMatuschak個人の裁量。商用ロードマップは無い。
- 出典: [GitHub andymatuschak/orbit](https://github.com/andymatuschak/orbit), [Orbit (notes)](https://notes.andymatuschak.org/Orbit)

### 1-3. Anki の "review debt"（バックログ）問題と対処 — **現在も進行中の最大課題**
- **現象**: 数日サボると復習が翌日以降に**線形に積み上がる**（SM-2は失敗カードを短期間隔に戻すため雪だるま式）。Anki公式マニュアルも「バックログがあるなら新規カード投入を止めよ」と明言。
- **コミュニティの経験則**: 新規カード:復習の比は概ね1:10。「週末にまとめてキャッチアップ」は**心理的にほぼ機能しない**——1セッションで400枚やろうとすると最初の50〜60枚を過ぎたあたりから質が急落し「学習ではなく流し見」になる、という実務者の指摘が繰り返し見られる（複数のAnki解説サイトで一致した記述だが、いずれも一次情報ではなく実務ブログ。**未確認**扱い）。
- **対処策の実例**:
  - **"Limit New by Young" アドオン**（GitHub: lune-stone/anki-addon-limit-new-by-young）— 「若いカード」の総数に上限を設け、新規投入ペースを既存負債に応じて自動で絞る。手動チューニング不要という設計思想。
  - **Anki公式のnew card limit / review limit** — デッキオプションでレビュー上限を設定すると新規カードも自動的に絞られる仕組み。
  - **デッキ全体をsuspendするのは逆効果**という指摘が複数——再開時に未処理分が**全部同時に**キューに戻るため、離脱前より山が大きくなる。
- **示唆**: 「借金の全体量を見せない・一括返済させない・投入ペース自体を制御する」がAnkiコミュニティの学習済み解。
- 出典: [Anki Deck Options manual](https://docs.ankiweb.net/deck-options.html), [Dynamic new card limit thread](https://forums.ankiweb.net/t/dynamic-daily-new-card-limit-based-on-total-daily-reviews-count/65120), [limit-new-by-young](https://github.com/lune-stone/anki-addon-limit-new-by-young)（※実務ブログ群の具体的離脱率数値は一次情報未確認）

### 1-4. FSRS（Free Spaced Repetition Scheduler, Jarrett Ye, 2022〜／Anki 23.10以降デフォルト＝現行）
- **仕組み**: SM-2の固定的なease係数モデルを、ユーザー個人の実復習履歴（Anki公式ベンチマークは**5億件超**のレビューログ、コミュニティ提供データセットは**14億件・2万ユーザー**）から学習するパラメトリックモデルに置換。「Desired Retention（目標保持率）」をユーザーが指定すると逆算して間隔を出す。
- **効果**: Anki公式ベンチマーク（5億件超のレビューログ）で、**同じ保持率に対しSM-2よりおよそ20〜30%少ないレビュー数**で済む。FSRS-6はコレクションの**99.6%でSM-2より予測精度（log loss）が高い**。
- **バックログ対策として同梱される機能（fsrs4anki-helper）**: **Load Balance**（復習日を均して特定日への集中を防ぐ）、**Easy Days**（曜日ごとに負荷を下げる）、**Postpone/Advance**（ユーザーが手動で前後にずらせる）。
- **開発中に見つかった逆説**（LessWrongの開発史より）: 「ease hell」対策で難易度の減衰を双方向にかけると精度が落ちるため**片方向のみ**に制限——アルゴリズムの予測精度とユーザー体験の最適化目標は必ずしも一致しない、と開発者自身が認めている。
- 出典: [The History of FSRS for Anki (LessWrong)](https://www.lesswrong.com/posts/G7fpGCi8r7nCKXsQk/the-history-of-fsrs-for-anki), [fsrs4anki wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm), [fsrs4anki-helper](https://github.com/open-spaced-repetition/fsrs4anki-helper)

### 1-5. SuperMemo incremental reading（Piotr Wozniak, 1990年代〜／細々と現行だが不人気）
- **仕組み**: 読書と間隔反復を同一のキューに統合——長文をエクストラクト（抜粋）→クローズ化→カード化という連続的パイプラインで、「読む」「覚える」の境界を溶かす。muninnが目指す方向性に理論的に最も近い先行例。
- **なぜ普及しなかったか**: 30年近く複数プラットフォーム・複数実装者が挑んでも「本当に離陸したバージョンが無い」というのがコミュニティの共通認識。理由として①**単純なSuperMemoですら人間の性質（先延ばし・完璧主義）に阻まれる**のに、incremental readingは遥かに複雑でハードルがさらに高い、②Wozniak自身への信頼性を巡る論争（研究者としての姿勢への疑義）、③本体が言語パック販売にビジネスの軸足を移し、コア機能への投資が細った、という複合要因。「頭を悪くする」という批判も一部で存在。
- 出典: [supermemo.guru/wiki/Incremental_reading](https://supermemo.guru/wiki/Incremental_reading), [The true history of spaced repetition](https://www.supermemo.com/en/blog/the-true-history-of-spaced-repetition)（inevitability記事は403で本文未確認、要旨は検索結果スニペットに基づく＝**確度中**）

### 1-6. Readwise Daily Review（2019〜現行）
- **仕組み**: 毎朝メール／アプリで**少数のハイライト**を復習に出す。形式は「多肢選択」「クローズ削除」「そのまま再読して自己評価」の3種混在。自己申告の想起品質で次回間隔を調整し、忘れやすいものほど頻出させる。
- **削ったコスト**: 「カードを自作する」手間そのもの——ハイライトした瞬間に将来カード化される前提で設計されている。1日2〜3分という時間コストの明示。
- **効いている理由**: 「積極的想起（active recall）は受動的再読より効果が高い」という研究知見をそのまま製品化。継続者は**約1000日連続**という報告例あり（同社ブログ内の紹介、第三者検証なし）。
- 出典: [Adding Intention to Spaced Repetition](https://blog.readwise.io/adding-intention-to-spaced-repetition/), [Readwise Daily Review docs](https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights)

### 1-7. Duolingo — ストリーク＋Practice Hub（現行、頻繁に改修）
- **仕組み**: ①ストリーク（連続日数）による損失回避の圧、②Practice Hub＝「直近の間違いだけ」を狙い撃ちする適応的復習セッション（Super会員限定）。
- **実測値**（第三者ブログ経由の同社発表値の引用が中心＝**確度中**）: 月次チャーンは2020年中盤47%→2023年初37%→2023年末に欧米市場で28%まで低下。ストリーク7日達成者は長期継続率3.6倍。ストリーク延長の賭け（wager）提示で14日後継続率+14%。**Streak Freeze（凍結アイテム）導入でチャーン-21%**——「連続記録を失う恐怖」を緩和する保険が離脱防止に直結した点は重要な反証（罰だけでなく赦しの設計が要る）。
- **批判・失敗事例**: arXiv論文 *"When Gamification Spoils Your Learning"*（Mogavi et al., ACM L@S 2022）—Duolingoフォーラム9年分の内容分析＋ユーザー15人への半構造化インタビューにより、**「競争性」「遊戯性への耽溺」「群集行動（herding）」**が学習を阻害する「ゲーミフィケーション濫用」を引き起こすと報告。ユーザーが本来の学習目的を見失い時間を浪費するケースを実証的に指摘。
- 出典: [When Gamification Spoils Your Learning (arXiv)](https://arxiv.org/pdf/2203.16175), [Duolingo Practice Hub](https://blog.duolingo.com/keeping-you-at-the-frontier-of-learning-with-adaptive-lessons/), 各種チャーン数値はStriveCloud/Orizon等の二次分析記事に基づく

### 1-8. Leitner system（Sebastian Leitner, 1972／原型として現行）
- **仕組み**: 箱を3〜5段用意し、正解したカードは次の箱（＝より長い間隔）へ、不正解は最初の箱に戻す。アプリ無し・アルゴリズム無しで間隔反復の核（「難しいものほど頻繁に」）だけを実装した最小構成。
- **示唆**: すべてのデジタル実装（SM-2, FSRS含む）の思想的原点。「箱の移動」という物理的操作が、電子UIにおける「めくる→2択」の直接の先祖にあたる。
- 出典: [e-student.org/leitner-system](https://e-student.org/leitner-system/)

### 1-9. Anki alternatives（Mochi / RemNote / Traverse / Memrise, 現行）
- **Mochi**: ボタンが**Forgot/Remembered の2択のみ**。Markdownで書いた箇条書きの一部をそのままカード化。「Ankiクオリティのアルゴリズムを、モダンで軽いUIで」という位置づけ。
- **RemNote**: ノートそのものにブロック単位でフラッシュカードを埋め込み、知識グラフで概念同士をリンク。SM-2とFSRS両対応。「ノートを書く」と「カードを作る」を同一動作にする点がmuninnのnotes/との親和性が高い。
- **Memrise**: 語学特化。ネイティブ動画・AI会話練習で「思い出す」を実世界文脈に埋め込む。
- 出典: 各社サイト、および比較記事（Mindomax, study-genius-ai等の二次情報＝確度中）

---

## 2. 心理学的裏付け（数値つき）

- **testing effect / retrieval practice**（Roediger & Karpicke, 2006, *Psychological Science*）: 4回読んだだけの群と「1回読んで残りは白紙に書き出す想起」群を比較。5分後は前者が有利（83% vs 71%）だが、**1週間後は逆転し想起群61% vs 再読群40%**。短期は再読が有利でも長期は想起が圧勝という「望ましい困難（desirable difficulty）」の典型例。
- **generation effect**（メタ分析, Bertsch et al., *Memory & Cognition*）: 86研究・445効果量を統合し、**効果量 d=.40**（読むだけに比べ、自分で生成した情報の記憶がおよそ0.4標準偏差分優れる）。
- **hypercorrection effect**（Butterfield & Metcalfe, 2001）: 高い自信を持って間違えた後に訂正された項目は、**正しく答えた項目より定着が良い**。誤答からのフィードバックが強い期待とのギャップを生み、訂正情報が印象に残るためと説明される。
- **spacing effect**: 認知心理学で最も再現性の高い知見の一つ——同じ復習回数でも、間隔を空けた分散学習は集中学習（一夜漬け）より保持が良い。SM-2/FSRS/Leitnerはすべてこれの工学的実装。

---

## 3. 原理（3〜6個）

1. **「想起の質」は間隔そのものより「投入ペースの制御」で決まる**。Quantum Countryの実験（2週間先延ばしで91%→87%、規則的復習で89%→96%）が示すのは"間隔を守ること"の効果であり、Ankiのreview debt問題が示すのは"間隔が守れない状態を後から挽回しようとしても心理的に機能しない"こと。→ **後手の一括処理では直らない。前手でペースを絞る設計が必要**。
2. **借金の可視化と借金の返済強制は別物**。「未消化件数バッジを出さない」というmuninnの既存原則は、Ankiコミュニティが辿り着いた"デッキ全体suspendは逆効果（再開時に山が全部積み上がって見える）"という失敗と整合する。数を見せることは悪ではないが、**「減る数」を見せると行動が止まり、「増える数」を見せると行動が続く**——FSRSのLoad BalanceやEasy Daysも「借金の総量」ではなく「今日の投入量」だけを制御対象にしている。
3. **想起は"クイズ"ではなく"望ましい困難を伴う読み物"として提示すると長期定着が伸びる**（generation effect d=.40、testing effectの1週間後逆転）。Quantum Countryやmnemonic mediumが本文に問いを埋め込む設計思想も、Readwiseがハイライトを「多肢選択/クローズ/再読」の混合で出す設計も、この原理の応用。
4. **誤答・迷いは失敗ではなく素材**。hypercorrection effectにより、確信を持って間違えて訂正された記憶はむしろ強化される。→ 想起UIは「わかった／あやしい」の判定を**恥や罰として扱わない**方が理論的に正しい（Duolingoのストリーク圧やAnkiのヒートマップが招く"借金メーター化"の逆）。
5. **損失回避の設計は諸刃の剣——"失う恐怖"は強力だが、"赦しの弁"が無いと離脱を加速する**。DuolingoのStreak Freezeがチャーンを21%改善した事実は、ストリーク圧そのものではなく「取り返しがつく」という安心感が継続を支えることを示す。
6. **摩擦を削る先は「カード作成」ではなく「セッション開始の意思決定」**。Readwise/Quantum Country/mnemonic mediumはいずれも「カードを自分で作る」コストをゼロに近づけ、ユーザーに残る決断を「今日やるか」だけに縮小している。FSRSのアルゴリズム改善（20-30%レビュー削減）も同じ方向——**枚数を減らすこと自体が体験改善**であり、精度向上はその手段。

---

## 4. 「59件全部が期限切れ」という詰んだ在庫を毎日の数枚に切り出す方法（5案＋ボツ理由）

1. **キャップ付き"今日の数枚"抽出（review limit方式）**: `next <= 今日` の59件から、優先度順（例: interval昇順＝最も基礎的で忘れやすい順、または最終復習日が最も古い順）に**1日3〜5枚だけ**を抽出しセッションに出す。Anki公式のreview limitと同じ発想。
   - **ボツになりうる理由**: 「どの3〜5枚を選ぶか」のロジック自体が恣意的になりやすく、59件が均等に消化されるまで**約12〜20日かかる**——その間「全部期限切れ」という後ろめたさが本人の意識に残り続ける可能性（バッジを出さなくても本人は知っている）。
2. **FSRS流Load Balancing——59件を"今日出す分"に均等分散再スケジュール**: 影SRSの`next`を一括で「今日から2〜3週間に均等分散」で再割当てし、以後は正常なSRSサイクルに戻す。
   - **ボツになりうる理由**: 正本markdownのsrsを書き換えない設計（サイトはlocalStorage影SRSのみ）なので、"再スケジュール"は影SRS側でしか完結せず、**正本のnextは59件とも過去のまま**という不整合が残る。伝票経由でClaude Codeにまとめてnext更新をコミットさせる一手間が要る。
3. **"今日はこの1本"——1セッション1問の原則を初日から適用し、複数日かけて溶かす**: 既存の「1セッション=1問」（/mn-review）方針をサイト側の想起UIにもそのまま持ち込み、**59件を1日1問ずつ、約2ヶ月かけて**平常運転に戻す。
   - **ボツになりうる理由**: 2ヶ月は長すぎる。日々の体験としては安全だが、「詰んだ在庫」を"再始動"というイベントとして扱いたい意図（ループが止まっていたこと自体への手当て）には応えられず、ただのスロー消化に見える。
4. **"ウェルカムバック"特別モード——最初の数日だけ枚数を厚くし、通常運転にランディングする**: 初回起動時は「思い出す運動を再開しよう」という文脈で1日8〜10枚、5日ほどで消化し、以後は新規に発生するnext分（1日数枚）に戻す。DuolingoのStreak Freezeのように「今回は特別」という区切りを明示。
   - **ボツになりうる理由**: モード切替を作らない、という既存原則（起動コストゼロ）と真正面から矛盾する。"ウェルカムバック"という状態をUIが持つこと自体が、想起を「クイズ」ではなく「読み物」として同一視するmuninnの思想からズレるリスクがある。
5. **優先度を"新しさ"ではなく"recallの読みやすさ・軽さ"で決める——最初の数枚をあえて易しいものにする**: 59件全部が同格の負債ではなく、`recall:`の問いの性質（短文で答えやすいもの/長考が要るもの）でソートし、**再始動の最初の数枚は成功体験になりやすいものから出す**。ゲームの序盤チュートリアル的発想。
   - **ボツになりうる理由**: 「易しい」の自動判定が困難（recallの文の長さでは測れない）。人手で59件を格付けする初期コストが発生し、"継続的に回る仕組み"であるべき想起ループの外側に、一度きりの重い初期設定タスクを作ってしまう。

**総合すると**、案1（review limit的な日次キャップ）を基本に、案2（影SRSの再スケジュール一括処理）を初回のみ組み合わせるハイブリッドが、既存の「バッジを出さない」「モード切替を作らない」原則と最も摩擦が少ない。案3は安全だが遅すぎ、案4・5は原則と衝突する。

---

## 5. 実装の勘所

- **判定UIの選択肢数**: Anki公式フォーラムの実証分析（Expertium, FSRS-4.5データ）では2択 vs 4択の精度差は**統計的有意差なし**（4択の一貫ユーザーが39件と少なくデータ不足の限界あり）。muninnの「わかった／あやしい」2択＋自由記述有無によるq分岐（4段階相当）は、**2択の心理的軽さ**と**4段階相当の情報量**を両立させる設計として理論的に妥当。ボタン数を増やす方向の改修は優先度低い。
- **めくる操作**: タイトル（答えそのもの）を隠し`recall:`だけ見せる設計は、generation effect（d=.40）とtesting effect（1週間後61% vs 40%）を最大限利用する構造として正しい。「めくる」という物理的操作の遅延自体が想起の試行を保証する重要なゲート——ワンタップで答えが見えるUIにしないこと。
- **1セッションの長さ**: Readwiseは1日2〜3分・少数問を継続の型として実証（1000日連続ユーザー例）。Anki実務知見では「1セッションで数十枚を超えると質が急落」。**muninnの1日数枚方針は両者と整合**——枚数を増やす誘惑（消化を急ぐ）に対しては抑制的であるべき。
- **誤操作の取り消し**: hypercorrection effectを踏まえると、「あやしい」を押した後の取り消し（＝正解扱いへの訂正）は定着を損なわない可能性が高い（誤答からの訂正はむしろ記憶を強化する）。取り消しUIの心理的コストは低いと考えてよい。
- **「今日はもう終わり」の伝え方**: 「件数バッジを出さない」原則と合わせるなら、残数ではなく**「今日の分は読み終えた」という完了メッセージ**（増えるカウンタ＝本日読んだ枚数の提示）で終える。Timehopの「24時間で消える」設計や、Duolingoの「今日のレッスン達成」表示のように、**当日単位で閉じる**演出が「明日また来る」動機に繋がりやすい。残り59件からの消化率という分母を見せないこと。
- **アルゴリズム面**: SM-2からFSRSへの移行実績（同一保持率で20-30%レビュー削減）は「精度を上げてレビュー数を減らす」正攻法だが、muninnの規模（59件）では絶対数が小さく効果は限定的。**優先すべきはアルゴリズム精度よりも日次キャップの運用ルール**。

---

## 出典まとめ（一次情報優先、二次情報は明記）

- https://quantum.country/qcvc
- https://numinous.productions/ttft/
- https://notes.andymatuschak.org/Mnemonic_medium
- https://andymatuschak.org/books/
- https://github.com/andymatuschak/orbit
- https://docs.ankiweb.net/deck-options.html
- https://forums.ankiweb.net/t/dynamic-daily-new-card-limit-based-on-total-daily-reviews-count/65120
- https://github.com/lune-stone/anki-addon-limit-new-by-young
- https://www.lesswrong.com/posts/G7fpGCi8r7nCKXsQk/the-history-of-fsrs-for-anki
- https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
- https://github.com/open-spaced-repetition/fsrs4anki-helper
- https://forums.ankiweb.net/t/pass-fail-grading-as-default/34147/120
- https://supermemo.guru/wiki/Incremental_reading（inevitability記事は403で未読・要旨は検索スニペット由来＝確度中）
- https://blog.readwise.io/adding-intention-to-spaced-repetition/
- https://docs.readwise.io/readwise/docs/faqs/reviewing-highlights
- https://arxiv.org/pdf/2203.16175（Mogavi et al., ACM L@S 2022, Duolingo gamification misuse）
- https://blog.duolingo.com/keeping-you-at-the-frontier-of-learning-with-adaptive-lessons/
- https://e-student.org/leitner-system/
- Roediger & Karpicke (2006), *Psychological Science* — testing effect（journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x）
- Bertsch et al., generation effect meta-analysis, *Memory & Cognition*（link.springer.com/article/10.3758/BF03193441）
- Butterfield & Metcalfe (2001), hypercorrection effect
- Duolingoのチャーン率・ストリーク数値はStriveCloud/Orizon等の二次分析記事に基づく（同社公式発表の引用だが一次資料未直接確認＝確度中）
