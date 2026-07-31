# モック用データ `mn-data.js`（実データ）

同ディレクトリの `mn-data.js` を `<script src="mn-data.js"></script>` で読むと `window.MN` に入る。
**muninn の本物のデータ**（2026-07-31 時点）。ダミーテキストは使わないこと。

```js
window.MN = {
  generatedAt: "2026-07-31",

  notes: [{                    // 93本（knowledge 59 / insight 34）
    slug, title,               // title は「言い切り形」＝答えそのもの。想起では伏せる対象
    tags: ["health/skincare"], // 階層タグ。末端が表示名（tagLabel 相当は自前で用意してよい）
    kind: "knowledge"|"insight",
    created, updated,          // "YYYY-MM-DD"（updated は git 由来の最終更新日）
    recall,                    // 想起の問い。knowledge 59本すべてに入っている（insight は null）
    next, last,                // srs。next<=今日 が出題対象。※59本すべて期限切れなので総量は絶対に出さない
    links: ["slug", ...],      // 本文中の [[wikilink]] のターゲット（アウトバウンド。理由なしも含む）
    linkrefs: [{t, r}, ...],   // ★最重要★ `- [[t]] — r` 形式のリンクと「なぜ関連するか」の理由文
    ex                         // 本文の冒頭240字（生 markdown）
  }],

  mocs: [{ slug, title, sections: [{ title, items: [{target, alias, reason}] }] }],
                               // 手書き索引。section = 「束」。6件

  follows: [{                  // 3対象
    name, title,
    followType: "goal"|"interest",
    goal, tags, snapshot: [str], focus: [{title,note,priority}],
    nextMatches: [{date, opponent, competition, home}],
    series: [{ key, goal: "up"|"down"|null, points: [{date, value}] }],
                               // ★goal が null の指標は良し悪しを判定しないこと（原則9）
    coach, formation, rivals: [{name, note}],
    entities: [{slug,title,group:"GK"|"DF"|"MF"|"FW",role,club,status,deepDive,strengths:[],developing:[],changelog:[{date,note}]}],
    sessions: [{ date, summary, metrics: {キー: 数値}, ex }]   // 新しい順
  }],

  atlases: [{                  // 1件（philosophy）
    slug, title, tags, ex,
    routes: [{ id, label, desc, order: ["concept-slug", ...] }],   // 読む順路。2本ある
    concepts: [{ slug, title, gist, status: "written"|"stub", created, updated,
                 edges: { requires:[], contrasts:[], leadsTo:[], elaborates:[] },  // ★型付きエッジ
                 notes: ["note-slug"],  // notes/ への蒸留先
                 tags, ex }]
  }],

  logtopics: [{                // 1件（coffee-beans・記録は1件だけ＝比較が空回りしている状態）
    slug, title, tags,
    fields: [{ key, label, type, options, unit, required, max }],  // スキーマ
    display: { subtitle, badge, cardFields, filters, sort },
    entries: [{ slug, title, created, image, fields: {キー: 値}, ex }]
  }]
};
```

## 覚えておくべき数字

```
記事 93（knowledge 59 / insight 34）   knowledge は 59本すべてが復習期限切れ
タグは20種弱。sports/golf だけで 42本＝全体の 47%
連載 1本（概念11・stub含む・ルート2本）  定点 3（goal 2 / interest 1・選手10人）
記録帖 1トピック・記録1件               束（MOCのセクション）は数個
ノード総数 ≒ 200
```

## ルート（既存URLの対応。使うかどうかは自由）

```
/note/:slug · /follow/:name · /follow/:name/player/:slug
/atlas/:slug · /atlas/:slug/concept/:cslug
/log/:topic · /log/:topic/entry/:slug
```

## 被リンクの作り方（★この案件の肝）

`site.json` はアウトバウンドしか持たない。**被リンクはクライアントで逆引きする**。
`linkrefs` を使えば「誰が・なぜ・自分にリンクしたか」が取れる:

```js
// 例: route をキーにした被リンク索引
const back = new Map();
for (const n of MN.notes)
  for (const {t, r} of n.linkrefs)
    (back.get(t) ?? back.set(t, []).get(t)).push({ from: n.slug, title: n.title, reason: r });
```

`linkrefs` の `t` はほぼ note の slug だが、follow 名・concept slug を指すこともある。
解決できないターゲットは黙って捨てること（壊れリンクを画面に出さない）。
