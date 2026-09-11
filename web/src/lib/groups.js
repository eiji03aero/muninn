// 「一覧」——蓄積を**種類（グループ）ごと**に束ねて数え、全件を並べるための索引。
//
// なぜ要るか: 以前は網羅の入口が「テーマ（タグの面積マップ）」だった。面積マップは偏りを
// 事実として描けるが、**「何の種類のものが、いくつあるか」には一度も答えていなかった**。
// 記事・連載・記録帖・定点・作品は貯め方も読み方も違うのに、タグで割ると全部が同じ点として散る。
// ここは種類で割って全件に到達させる1問だけに答える（web/DESIGN.md 原則7・原則19）。
//
// lib なので**面の名前を知らない**。読了だけは localStorage 由来なので呼び出し側から reads を渡す。

import { cleanTitle, tagLabel } from './graph.js';
import { buildSeries, countText, firstLine } from './series.js';

// 画面に出す語。concern 名（notes / atlas / logs / follows / writings）は出さない。
// id は検索の種別フィルタ（graph のノード型）と同じ語にして、一覧と検索で呼び名を割らせない。
export const GROUPS = [
  { id: 'note', label: '記事', lead: '1件に1つの知識。調べた事実と、自分の言葉の気づき' },
  { id: 'atlas', label: '連載', lead: '順路に沿って章を読み進める' },
  { id: 'logtopic', label: '記録帖', lead: '同じ項目で貯めて、並べて比べる' },
  { id: 'follow', label: '定点', lead: '同じ条件で観測して、前回と比べる' },
  { id: 'piece', label: '作品', lead: 'お題に沿って書き、同じ5軸の講評で書き直す' },
];

export const groupById = (id) => GROUPS.find((g) => g.id === id) || null;

const PIECE_STATUS = {
  drafting: { label: '推敲中', tone: 'amber' },
  done: { label: '確定', tone: 'green' },
  shelved: { label: '棚上げ', tone: 'faint' },
};
export const pieceStatus = (s) => PIECE_STATUS[s] || PIECE_STATUS.drafting;

// 作品の最新の版（点が付いている最後の版）。点は前回の自分との差分を見るためのもの。
export function latestRound(piece) {
  const scored = (piece.rounds || []).filter((r) => typeof r.total === 'number');
  return scored.length ? scored[scored.length - 1] : null;
}

const byDateDesc = (key) => (a, b) => {
  const av = a[key] || '', bv = b[key] || '';
  if (av === bv) return a.title.localeCompare(b.title, 'ja'); // 同着はタイトルで決める（原則10）
  return bv.localeCompare(av);
};

// グループごとの「並べられる形」。route / title / meta（件数や点）/ date で揃える。
// `date` は**そのグループを並べている軸そのもの**を入れる（記事は作成日、増えていくものは最終更新）。
// 並び順と表示日が食い違うと、「動いた順」の先頭に古い日付が出て一覧が嘘をつく。
export function buildGroups(site, reads = {}) {
  const series = buildSeries(site, reads);
  const fromSeries = (kind) => series
    .filter((s) => s.kind === kind)
    .map((s) => ({
      key: s.key, route: s.route, title: s.title, gist: s.gist,
      tags: s.tags, meta: countText(s), created: null, updated: s.updated, date: s.updated,
      progress: s.progress, series: s,
    }));

  const items = {
    note: (site.notes || [])
      .map((n) => ({
        key: `note:${n.slug}`, route: `/note/${n.slug}`, title: n.title,
        gist: '', tags: n.tags || [],
        meta: (n.tags || []).map(tagLabel).join(' · '),
        badge: n.kind === 'insight' ? 'じぶんの言葉' : null,
        created: n.created, updated: n.updated || n.created, date: n.created,
      }))
      .sort(byDateDesc('created')),
    atlas: fromSeries('atlas'),
    logtopic: fromSeries('log'),
    follow: fromSeries('follow'),
    piece: (site.writings?.pieces || [])
      .map((w) => {
        const last = latestRound(w);
        const max = (site.writings?.rubric?.max || 5) * (site.writings?.rubric?.axes?.length || 5);
        return {
          key: `piece:${w.slug}`, route: `/piece/${w.slug}`, title: cleanTitle(w.title),
          gist: w.form || firstLine(w.prompt), tags: w.tags || [],
          meta: last ? `${w.rounds.length}版 · 最新 ${last.total}/${max}` : `${w.rounds.length}版`,
          badge: pieceStatus(w.status).label,
          created: w.created, updated: w.updated || w.created, date: w.updated || w.created,
        };
      })
      .sort(byDateDesc('updated')),
  };

  return GROUPS.map((g) => {
    const list = items[g.id] || [];
    return {
      ...g,
      items: list,
      count: list.length,
      updated: list.map((i) => i.updated).filter(Boolean).sort().pop() || null,
    };
  });
}

// 読みかけの連載（1章でも読んだもの）。一覧の先頭に「続きから」として差し出す材料。
// 読みかけが1本も無いときだけ、いちばん新しい連載を1本だけ返す——未読を全部並べると
// 下の一覧と丸ごと重複して嵩むだけになる。
export function resumeChapters(site, reads = {}, limit = 3) {
  const atlases = buildSeries(site, reads).filter((i) => i.kind === 'atlas' && i.next);
  const reading = atlases.filter((i) => i.done > 0).slice(0, limit);
  return { reading: reading.length > 0, items: reading.length ? reading : atlases.slice(0, 1) };
}
