// 作品（creation concern）の本文を、読める順序に組み替えるための分解器。
//
// 正本の1ファイルには「お題 → 作品メモ → 第1稿 → 講評 → 第2稿 → …→ 完成稿」が時系列で積まれている。
// **それが正本として正しい**（推敲の軌跡そのものが資産）——が、読む順序としては正しくない。
// 完成した作品を読みたい人に第1稿から読ませるのは、映画を撮影順に見せるのと同じことになる。
// ここで見出しごとに切り、面が「完成稿を先・推敲の記録を後ろ」に組み直せるようにする。
//
// frontmatter に本文を重複させない（atlas の concept と同じ方針）ので、パーサは見出しベースで素直に切る。
// 構造がテンプレートから外れていても**壊れない**こと——切れなかったものは extras に落とし、
// 面はそれをそのまま描けば、少なくとも全文は読める。

const H2 = /^##\s+(.+?)\s*$/;
// 「## v3 — 2026-09-10」「## v3」のどちらでも拾う
const VERSION = /^v(\d+)\s*(?:[—–-]\s*(\d{4}-\d{2}-\d{2}))?/;

export function splitPiece(body) {
  const lines = String(body || '').split('\n');
  const blocks = [];
  let cur = { title: null, lines: [] };
  for (const line of lines) {
    const m = line.match(H2);
    if (m) { blocks.push(cur); cur = { title: m[1], lines: [] }; continue; }
    cur.lines.push(line);
  }
  blocks.push(cur);

  const out = { lead: '', prompt: null, memo: null, versions: [], final: null, extras: [] };
  for (const b of blocks) {
    const text = b.lines.join('\n').replace(/^\s*-{3,}\s*$/gm, '').trim();
    if (b.title == null) { out.lead = text; continue; }
    const v = b.title.match(VERSION);
    if (v) {
      // 稿の中は「本文 → ### 講評 → ### 次の1稿の重点」の順。最初の `###` から後ろが講評。
      const i = text.search(/^#{3}\s/m);
      out.versions.push({
        v: Number(v[1]), date: v[2] || null, title: b.title,
        text: i < 0 ? text : text.slice(0, i).trim(),
        critique: i < 0 ? '' : text.slice(i).trim(),
      });
      continue;
    }
    if (/^お題/.test(b.title)) { out.prompt = text; continue; }
    if (/^作品メモ/.test(b.title)) { out.memo = text; continue; }
    if (/^完成稿/.test(b.title)) { out.final = text; continue; }
    out.extras.push({ title: b.title, body: text });
  }
  out.versions.sort((a, b) => a.v - b.v);
  return out;
}

// 軸ごとの推移（v1 → vN）。「引きの点は伸びているのか」に答える材料。
// 点は高いほど良いのが自明なので、follows の metric_goals にあたる宣言は持たせず up で固定する。
export function axisSeries(piece, axes) {
  return (axes || []).map((a) => ({
    key: a.key, label: a.label, desc: a.desc,
    points: (piece.rounds || [])
      .filter((r) => typeof r.scores?.[a.key] === 'number')
      .map((r) => ({ date: r.date || `v${r.v}`, value: r.scores[a.key] })),
  })).filter((s) => s.points.length > 0);
}
