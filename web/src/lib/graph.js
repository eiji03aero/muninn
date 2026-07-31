// サイト全体を「1つのノード集合」として見るためのインデックス。
//
// 現状の site.json は links[]（アウトバウンド）しか持たず、ノートを開くと行き止まりになっていた。
// ここで被リンクを逆引きし、muninn のリンク規約（`- [[x]] — なぜ関連するか`）を利用して
// 「リンク元が書いた理由」ごと逆流させる。加えて、タグ横断の在庫（棚）と MOC の束を組み立てる。
//
// 全データは復号済みでメモリ上にあるので、専用インデックスをビルド時に作らずここで計算する。
// （90記事規模なら数ミリ秒。過剰設計を避ける）

import { resolveTarget } from './wiki.js';

export const shortTitle = (t) => (t || '').split('—')[0].split('―')[0].trim();
export const cleanTitle = (t) => (t || '').replace(/\s*—.*$/, '').replace(/（.*?）/, '').trim();

// 本文から [[target]] と、その行に書かれた「— 理由」を取り出す。
// muninn のリンク規約は `- [[x]] — なぜ関連するか` なので、**区切り記号がある場合だけ**理由とみなす。
// 区切り無しの地の文（例:「詳細は [[x]] を正本とする。」）から後半を切り出すと文の断片になるため拾わない。
// 1行に複数リンクがある場合も、どのリンクの理由か特定できないので付けない（誤った理由より無いほうがよい）。
export function linksWithReason(body) {
  const out = [];
  for (const line of (body || '').split('\n')) {
    const found = line.match(/\[\[[^\]]+\]\]/g);
    if (!found) continue;
    const tail = line.split(']]').pop() || '';
    const m = tail.match(/^\s*(?:—|--|―)\s*(.+)$/);
    const reason = found.length === 1 && m ? m[1].trim() : '';
    for (const raw of found) {
      const target = raw.slice(2, -2).split('|')[0].trim();
      out.push({ target, reason });
    }
  }
  return out;
}

const TYPE_LABEL = {
  note: '記事', concept: '章', entity: '人物', session: '観測',
  logentry: '記録', follow: '定点', atlas: '連載', logtopic: '記録帖', moc: '索引',
};
export const typeLabel = (t) => TYPE_LABEL[t] || t;

// 全concernのノードを共通の形に正規化する。route が一意なので route を ID として使う
// （wiki.js の resolveTarget が route を返すため、リンク解決とそのまま噛み合う）。
function collectNodes(site) {
  const nodes = [];
  const push = (n) => nodes.push(n);

  for (const n of site.notes) {
    push({
      route: `/note/${n.slug}`, type: 'note', slug: n.slug,
      title: n.title, short: n.title, tags: n.tags || [],
      created: n.created, updated: n.updated || n.created,
      kind: n.kind, srs: n.srs, recall: n.recall, body: n.body, ref: n,
    });
  }
  for (const m of site.mocs) {
    push({
      route: `/moc/${m.slug}`, type: 'moc', slug: m.slug,
      title: m.title, short: cleanTitle(m.title), tags: [],
      created: null, updated: m.updated, body: m.body, ref: m,
    });
  }
  for (const f of site.follows) {
    push({
      route: `/follow/${f.name}`, type: 'follow', slug: f.name,
      title: f.title, short: cleanTitle(f.title), tags: f.tags || [],
      created: null, updated: f.updated, body: f.body, ref: f,
    });
    for (const e of f.entities) {
      push({
        route: `/follow/${f.name}/player/${e.slug}`, type: 'entity', slug: e.slug,
        title: e.title, short: cleanTitle(e.title), tags: f.tags || [],
        created: null, updated: e.updated, body: e.body, ref: e, parent: f,
      });
    }
    for (const s of f.sessions) {
      push({
        route: `/follow/${f.name}#${s.date}`, type: 'session', slug: `${f.name}/${s.date}`,
        title: `${cleanTitle(f.title)}：${s.date} の観測`, short: `${s.date} の観測`,
        tags: f.tags || [], created: s.date, updated: s.date,
        body: s.body, links: s.links, ref: s, parent: f,
      });
    }
  }
  for (const a of site.atlases || []) {
    push({
      route: `/atlas/${a.slug}`, type: 'atlas', slug: a.slug,
      title: a.title, short: cleanTitle(a.title), tags: a.tags || [],
      created: null, updated: null, body: a.body, ref: a,
    });
    for (const c of a.concepts) {
      push({
        route: `/atlas/${a.slug}/concept/${c.slug}`, type: 'concept', slug: c.slug,
        title: c.title, short: shortTitle(c.title), tags: c.tags?.length ? c.tags : a.tags || [],
        created: c.created, updated: c.updated || c.created,
        status: c.status, body: c.body, ref: c, parent: a,
      });
    }
  }
  for (const t of site.logtopics || []) {
    push({
      route: `/log/${t.slug}`, type: 'logtopic', slug: t.slug,
      title: t.title, short: cleanTitle(t.title), tags: t.tags || [],
      created: t.created, updated: null, body: t.intro, ref: t,
    });
    for (const e of t.entries) {
      push({
        route: `/log/${t.slug}/entry/${e.slug}`, type: 'logentry', slug: e.slug,
        title: e.title, short: e.title, tags: t.tags || [],
        created: e.created, updated: e.updated || e.created,
        body: e.body, ref: e, parent: t,
      });
    }
  }
  return nodes;
}

export function buildGraph(site, idx) {
  const nodes = collectNodes(site);
  const byRoute = new Map(nodes.map((n) => [n.route, n]));

  // ---- 被リンク（ここへ来る道）----
  const backlinks = new Map(nodes.map((n) => [n.route, []]));
  for (const n of nodes) {
    const seen = new Set();
    for (const { target, reason } of linksWithReason(n.body)) {
      const r = resolveTarget(target, idx);
      if (!r || r.route === n.route) continue;
      const key = r.route;
      if (seen.has(key)) continue;
      seen.add(key);
      const list = backlinks.get(r.route);
      if (list) list.push({ route: n.route, title: n.short, type: n.type, reason });
    }
  }

  // ---- タグ横断の在庫（棚）----
  const tagIndex = new Map();
  for (const n of nodes) {
    if (n.type === 'moc') continue; // 索引そのものは在庫に数えない
    for (const tag of n.tags) {
      if (tag === 'moc') continue;
      if (!tagIndex.has(tag)) tagIndex.set(tag, { tag, nodes: [], byType: {} });
      const t = tagIndex.get(tag);
      t.nodes.push(n);
      t.byType[n.type] = (t.byType[n.type] || 0) + 1;
    }
  }
  for (const t of tagIndex.values()) {
    t.count = t.nodes.length;
    t.label = tagLabel(t.tag);
  }
  const tags = [...tagIndex.values()].sort((a, b) => b.count - a.count);

  // ---- MOC の束（##セクション）----
  // 束が属するタグは「中の項目が最も多く持つタグ」で決める。MOC 側にテーマ宣言を足させない
  // （手入力を増やすと、それ自体が古びて課題Cを再生産する）。
  const bundles = [];
  for (const m of site.mocs) {
    if (m.slug === 'home') continue; // 全MOCの入口。棚が置き換えるので束にはしない
    for (const sec of m.sections || []) {
      const items = sec.items
        .map((it) => {
          const r = resolveTarget(it.target, idx);
          const node = r ? byRoute.get(r.route) : null;
          return node ? { node, reason: it.reason, label: it.alias || node.short } : null;
        })
        .filter(Boolean);
      if (items.length < 2) continue;
      const votes = {};
      for (const it of items) for (const tg of it.node.tags) if (tg !== 'moc') votes[tg] = (votes[tg] || 0) + 1;
      const tag = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] || null;
      bundles.push({ id: `${m.slug}#${sec.title}`, title: sec.title, moc: m.slug, tag, items });
    }
  }

  // 束に入っていない記事（＝手書き索引の取りこぼし）をタグごとに数える
  const inBundle = new Set(bundles.flatMap((b) => b.items.map((i) => i.node.route)));

  return { nodes, byRoute, backlinks, tagIndex, tags, bundles, inBundle };
}

// タグの表示名。階層タグの末端を日本語に寄せる（画面に内部語彙を出さないため）
const TAG_JA = {
  'sports/golf': 'ゴルフ', 'sports/football': 'サッカー',
  'health/skincare': '肌', 'health/nutrition': '栄養', 'health/hair': '髪',
  'health/stress': 'ストレス', 'health/bathing': '入浴', 'health/sleep': '睡眠',
  'science/cosmology': '宇宙論', 'geopolitics/middle-east': '中東',
  'philosophy/ancient': '古代哲学', 'philosophy/epistemology': '認識論', philosophy: '哲学',
  'language/vocabulary': 'ことば', 'knowledge/zettelkasten': 'ノート術',
  'log/coffee': 'コーヒー',
};
export const tagLabel = (t) => TAG_JA[t] || (t || '').split('/').pop();

// URL では階層タグの / を -- に置き換える（HashRouter のパス解決が壊れるため）
export const tagToParam = (t) => (t || '').split('/').join('--');
export const paramToTag = (p) => (p || '').split('--').join('/');
