// 「いまどこにいるか」から、帯に並ぶ候補と、原点を叩いたときに起きることを決める。
//
// ここは純粋な計算に留める（DOM も副作用も持たない）。原点が実際に何をするかの実行は
// index.jsx の runAct が握る——原点の意味は1箇所でしか決まらない、を守るため。

import { dayIndex, hash32 } from '../../lib/edition.js';
import { shortTitle, cleanTitle } from '../../lib/graph.js';
import { resolveTarget } from '../../lib/wiki.js';
import { EDGE_KEYS, EDGE_OUT, insOf, kindOf, outsOf, plain, tagJa } from './model.js';

export const nodeScene = (route) => ({ t: 'node', route });
export const sceneKey = (s) => `${s.t}:${s.route || s.tag || ''}`;

const pickOfDay = (arr, today, salt) =>
  (arr.length ? arr[(dayIndex(today) + hash32(salt)) % arr.length] : null);

const pathItem = (dir, node, reason, k) => ({
  k, l: shortTitle(node.title).slice(0, 26),
  path: { dir, reason, node },
  act: { t: 'go', s: nodeScene(node.route) },
});

// ---------------- 帯の中身 ----------------
export function reelItems(scene, ctx) {
  const { site, graph, idx, extra, cards, judged, query, slips, today } = ctx;

  if (scene.t === 'today') {
    const items = cards.map((c, i) => ({
      k: '問い',
      l: `${tagJa((c.note.tags || [])[0]) || '記事'} ${i + 1}`,
      card: c.note.slug,
      done: !!judged[c.note.slug],
      act: { t: 'flip' },
    }));
    // 想起のあとに残る「今日の余白」。読み物を1つずつ差し出す
    const written = (site.atlases || []).flatMap((a) => a.concepts.filter((c) => c.status !== 'stub').map((c) => ({ a, c })));
    const ch = pickOfDay(written, today, 'thumb-chapter');
    if (ch) items.push({ k: '章', l: shortTitle(ch.c.title), act: { t: 'go', s: nodeScene(`/atlas/${ch.a.slug}/concept/${ch.c.slug}`) } });
    const recent = [...site.follows].sort((a, b) => ((a.sessions[0]?.date || '') < (b.sessions[0]?.date || '') ? 1 : -1))[0];
    if (recent) items.push({ k: '定点', l: cleanTitle(recent.title), act: { t: 'go', s: nodeScene(`/follow/${recent.name}`) } });
    const ins = site.notes.filter((n) => n.kind === 'insight');
    const pick = pickOfDay(ins, today, 'thumb-insight');
    if (pick) items.push({ k: '気づき', l: pick.title.slice(0, 24), act: { t: 'go', s: nodeScene(`/note/${pick.slug}`) } });
    items.push({ k: 'もう少し', l: 'あと5枚 出す', tone: 'act', act: { t: 'more' } });
    return items;
  }

  if (scene.t === 'shelf') {
    const items = graph.tags.map((t) => ({
      k: 'テーマ', l: `${t.label} ${t.count}`, tag: t.tag,
      act: { t: 'go', s: { t: 'theme', tag: t.tag } },
    }));
    for (const a of site.atlases || []) items.push({ k: '連載', l: cleanTitle(a.title), act: { t: 'go', s: nodeScene(`/atlas/${a.slug}`) } });
    for (const f of site.follows) items.push({ k: '定点', l: cleanTitle(f.title), act: { t: 'go', s: nodeScene(`/follow/${f.name}`) } });
    for (const t of site.logtopics || []) items.push({ k: '記録帖', l: cleanTitle(t.title), act: { t: 'go', s: nodeScene(`/log/${t.slug}`) } });
    for (const m of site.mocs) items.push({ k: '見取り図', l: cleanTitle(m.title), act: { t: 'go', s: nodeScene(`/moc/${m.slug}`) } });
    return items;
  }

  if (scene.t === 'search') {
    const q = (query || '').trim();
    if (!q) return [];
    const hits = searchAll(q, graph);
    // 見つからなかったときが本番。「ありません」で終わらせず、依頼への入口に変える
    if (!hits.length) {
      return [{
        k: '依頼', l: `「${q}」を調べてもらう`, tone: 'act',
        act: { t: 'ask', text: `「${q}」について調べて、muninn に記録して。客観的な事実は原子ノートにして、既存の記事と相互リンクすること。（muninn の中を探したが見つからなかった）` },
      }];
    }
    return hits.map((h) => ({
      k: kindOf(h.node), l: shortTitle(h.node.title).slice(0, 26),
      hit: h, act: { t: 'go', s: nodeScene(h.node.route) },
    }));
  }

  if (scene.t === 'ask') {
    const items = [{ k: '書く', l: '新しく頼む', tone: 'act', act: { t: 'write' } }];
    if (slips.length || ctx.pending.length) {
      items.push({ k: '渡す', l: `伝票をコピー ${slips.length + (ctx.pending.length ? 1 : 0)}件`, tone: 'act', act: { t: 'copy' } });
    }
    slips.forEach((s, i) => items.push({ k: `依頼${i + 1}`, l: s.label.slice(0, 24), slip: s, tone: 'act', act: { t: 'del', id: s.id } }));
    if (ctx.pending.length) {
      items.push({ k: '答え合わせ', l: `再読の結果 ${ctx.pending.length}件`, pending: true, tone: 'act', act: { t: 'copy' } });
    }
    return items;
  }

  if (scene.t === 'theme') {
    const list = graph.tags.find((t) => t.tag === scene.tag)?.nodes || [];
    const sorted = [...list].sort((a, b) => ((a.updated || '') < (b.updated || '') ? 1 : -1));
    const items = sorted.map((n) => ({ k: kindOf(n), l: shortTitle(n.title).slice(0, 26), node: n, act: { t: 'go', s: nodeScene(n.route) } }));
    const moc = site.mocs.find((m) => (m.sections || []).some((sec) => sec.items.some((it) => sorted.some((n) => n.slug === it.target))));
    if (moc) items.unshift({ k: '見取り図', l: cleanTitle(moc.title), act: { t: 'go', s: nodeScene(`/moc/${moc.slug}`) } });
    items.push({
      k: '依頼', l: 'このテーマを増やす', tone: 'act',
      act: { t: 'ask', text: `「${tagJa(scene.tag)}」について、muninn にまだ無いところを調べて記事にして。` },
    });
    return items;
  }

  const node = graph.byRoute.get(scene.route);
  if (!node) return [];
  const items = [];
  const ins = () => insOf(node.route, graph, extra).forEach((b) => items.push(pathItem('in', b.node, b.reason, '来る道')));

  switch (node.type) {
    case 'concept': {
      const a = node.parent;
      for (const key of EDGE_KEYS) {
        for (const t of node.ref.edges?.[key] || []) {
          const to = graph.byRoute.get(`/atlas/${a.slug}/concept/${t}`);
          if (to) items.push(pathItem('out', to, EDGE_OUT[key].why, EDGE_OUT[key].k));
        }
      }
      for (const ns of node.ref.notes || []) {
        const to = graph.byRoute.get(`/note/${ns}`);
        if (to) items.push(pathItem('out', to, 'この章から覚える価値のある知識として切り出した', '蒸留'));
      }
      ins();
      if (node.ref.status === 'stub') {
        items.push({
          k: '依頼', l: 'この章を書いてもらう', tone: 'act',
          act: { t: 'ask', text: `/mn-learn 連載「${cleanTitle(a.title)}」の章「${shortTitle(node.title)}」はまだ書かれていない。読み物として書いて。` },
        });
      } else {
        items.push({
          k: '依頼', l: 'この章を深掘りする', tone: 'act',
          act: { t: 'ask', text: `/mn-learn 「${shortTitle(node.title)}」から深掘りしたい。elaborates で親に繋いだ新しい概念ノードを作って。` },
        });
      }
      break;
    }
    case 'atlas': {
      for (const r of node.ref.routes) {
        const first = graph.byRoute.get(`/atlas/${node.slug}/concept/${r.order[0]}`);
        if (first) items.push({ k: '順路', l: r.label, route: r, act: { t: 'go', s: nodeScene(first.route) } });
      }
      for (const c of node.ref.concepts) {
        items.push({
          k: c.status === 'stub' ? '未執筆' : '章', l: shortTitle(c.title).slice(0, 26),
          concept: c, act: { t: 'go', s: nodeScene(`/atlas/${node.slug}/concept/${c.slug}`) },
        });
      }
      break;
    }
    case 'follow': {
      for (const s of node.ref.sessions) {
        items.push({ k: '観測', l: s.date, sess: s, act: { t: 'go', s: nodeScene(`/follow/${node.slug}#${s.date}`) } });
      }
      for (const e of node.ref.entities) {
        items.push({
          k: e.deepDive ? '深掘り' : '人物', l: cleanTitle(e.title),
          ent: e, act: { t: 'go', s: nodeScene(`/follow/${node.slug}/player/${e.slug}`) },
        });
      }
      ins();
      items.push({
        k: '依頼', l: '次の観測を頼む', tone: 'act',
        act: { t: 'ask', text: `/mn-follow 「${cleanTitle(node.title)}」の次の観測を記録したい。` },
      });
      break;
    }
    case 'session': {
      const f = node.parent;
      for (const s of f.sessions) {
        items.push({ k: '観測', l: s.date, sess: s, act: { t: 'go', s: nodeScene(`/follow/${f.name}#${s.date}`) } });
      }
      for (const o of outsOf(node, graph, idx)) items.push(pathItem('out', o.node, o.reason, '伸びる道'));
      break;
    }
    case 'entity': {
      const f = node.parent;
      for (const e of f.entities) {
        items.push({
          k: e.slug === node.slug ? 'いま' : '人物', l: cleanTitle(e.title),
          ent: e, act: { t: 'go', s: nodeScene(`/follow/${f.name}/player/${e.slug}`) },
        });
      }
      ins();
      break;
    }
    case 'logtopic': {
      for (const e of node.ref.entries) {
        items.push({ k: '記録', l: e.title.slice(0, 24), entry: e, act: { t: 'go', s: nodeScene(`/log/${node.slug}/entry/${e.slug}`) } });
      }
      items.push({
        k: '依頼', l: '記録を足してもらう', tone: 'act',
        act: { t: 'ask', text: `/mn-log 「${cleanTitle(node.title)}」に新しい記録を足したい。` },
      });
      break;
    }
    case 'logentry': {
      const t = node.parent;
      for (const e of t.entries) {
        items.push({ k: '記録', l: e.title.slice(0, 24), entry: e, act: { t: 'go', s: nodeScene(`/log/${t.slug}/entry/${e.slug}`) } });
      }
      break;
    }
    case 'moc': {
      for (const sec of node.ref.sections || []) {
        for (const it of sec.items) {
          const r = resolveTarget(it.target, idx);
          const to = r && graph.byRoute.get(r.route);
          if (to) items.push({ ...pathItem('out', to, it.reason, '道'), l: (it.alias || shortTitle(to.title)).slice(0, 26) });
        }
      }
      break;
    }
    default: {
      ins();
      for (const o of outsOf(node, graph, idx)) items.push(pathItem('out', o.node, o.reason, '伸びる道'));
      items.push({
        k: '依頼', l: 'この記事について頼む', tone: 'act',
        act: { t: 'ask', text: `「${node.title}」について、` },
      });
    }
  }
  return items;
}

// ---------------- 原点を叩いたら何が起きるか ----------------
export function primaryOf(scene, item, ctx) {
  if (scene.t === 'today' && item?.card) {
    const v = ctx.judged[item.card];
    if (v && !ctx.rejudging) return { short: '次へ', label: '次の1枚へ', act: { t: 'next' } };
    if (!ctx.flipped && !v) return { short: 'めくる', label: 'めくる', act: { t: 'flip' } };
    return { short: '判定', label: '判定', act: null, split: true };
  }
  const a = item?.act;
  if (!a) return { short: '—', label: '選べるものが無い', act: null };
  switch (a.t) {
    case 'go': return { short: item.path ? '移る' : '開く', label: item.path ? 'この道へ移る' : '開く', act: a };
    case 'ask': return { short: '頼む', label: 'この依頼を書く', act: a };
    case 'write': return { short: '書く', label: '新しい依頼を書く', act: a };
    case 'copy': return { short: '写す', label: '伝票をまるごとコピー', act: a };
    case 'del': return { short: '外す', label: 'この依頼を伝票から外す', act: a };
    case 'more': return { short: '5枚', label: 'あと5枚 出す', act: a };
    case 'flip': return { short: 'めくる', label: 'めくる', act: a };
    default: return { short: '—', label: '—', act: null };
  }
}

// ---------------- 探す ----------------
// site.json は復号済みで全部メモリにある。90記事規模なら総当たりで数ミリ秒（日報と同じ判断）。
export function searchAll(q, graph) {
  const lc = q.toLowerCase();
  const out = [];
  for (const n of graph.nodes) {
    const extra = n.type === 'logentry' ? Object.values(n.ref.fields || {}).join(' ')
      : n.type === 'concept' ? (n.ref.gist || '')
        : n.type === 'note' ? (n.ref.recall || '') : '';
    const hay = [n.title, (n.tags || []).map(tagJa).join(' '), extra, n.body].join('\n').toLowerCase();
    const at = hay.indexOf(lc);
    if (at < 0) continue;
    const score = (n.title.toLowerCase().includes(lc) ? 20 : 0)
      + (extra.toLowerCase().includes(lc) ? 8 : 0)
      + (n.type === 'note' ? 3 : 0);
    out.push({ node: n, score, snip: snippet(n.body, q) || snippet(extra, q) });
  }
  return out.sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title)).slice(0, 40);
}

function snippet(body, q) {
  const i = (body || '').toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return null;
  const from = Math.max(0, i - 30);
  return {
    pre: (from > 0 ? '…' : '') + plain(body.slice(from, i)),
    hit: body.slice(i, i + q.length),
    post: plain(body.slice(i + q.length, Math.min(body.length, i + q.length + 60))),
  };
}
