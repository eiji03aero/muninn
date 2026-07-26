// 復号済みサイトデータから検索インデックスを作り、[[wikilink]] をアプリ内リンクに解決する。

export function buildIndex(site) {
  const notes = new Map(site.notes.map((n) => [n.slug, n]));
  const mocs = new Map(site.mocs.map((m) => [m.slug, m]));
  const follows = new Map(site.follows.map((f) => [f.name, f]));
  const entities = new Map();
  for (const f of site.follows) for (const e of f.entities) entities.set(e.slug, { entity: e, follow: f.name });
  const atlases = new Map((site.atlases || []).map((a) => [a.slug, a]));
  const concepts = new Map();
  for (const a of site.atlases || []) for (const c of a.concepts) concepts.set(c.slug, { concept: c, atlas: a.slug });
  return { notes, mocs, follows, entities, atlases, concepts };
}

// target（[[ ]] の中身）→ { route, label } or null
export function resolveTarget(target, idx) {
  const t = target.trim();
  if (t.includes('/')) {
    const [name] = t.split('/');
    if (idx.follows.has(name)) return { route: `/follow/${name}`, label: idx.follows.get(name).title };
  }
  if (idx.entities.has(t)) {
    const { entity, follow } = idx.entities.get(t);
    return { route: `/follow/${follow}/player/${t}`, label: entity.title };
  }
  if (idx.notes.has(t)) return { route: `/note/${t}`, label: idx.notes.get(t).title };
  if (idx.mocs.has(t)) return { route: `/moc/${t}`, label: idx.mocs.get(t).title };
  if (idx.atlases?.has(t)) return { route: `/atlas/${t}`, label: idx.atlases.get(t).title };
  if (idx.concepts?.has(t)) {
    const { concept, atlas } = idx.concepts.get(t);
    return { route: `/atlas/${atlas}/concept/${t}`, label: concept.title };
  }
  return null;
}

// body 中の [[t]] / [[t|alias]] を markdown リンク [text](#/route) に変換（未解決はプレーンテキスト）
export function wikiToMarkdown(body, idx) {
  return (body || '').replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, alias) => {
    const r = resolveTarget(t, idx);
    const text = (alias || '').trim() || (r ? r.label : t.trim());
    return r ? `[${text}](#${r.route})` : text;
  });
}
