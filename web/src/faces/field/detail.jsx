// 詳細（読む面）の中身。
//
// この面で唯一「上から下へ」読ませる場所。並びの法則（欄に近いほど強い）が
// 適用できない継ぎ目なので、代わりに**下端の道バー**（index.jsx の riser）で欄に繋ぐ。
// 行き止まりを作らないため、どの種別でも「ここから出ていく道」を必ず出す。

import { Md } from '../../shared/Md.jsx';
import { Sparkline } from '../../shared/Sparkline.jsx';
import { resolveTarget } from '../../lib/wiki.js';
import { linksWithReason, tagLabel, typeLabel } from '../../lib/graph.js';
import { relDay } from '../../shared/util.js';

const EDGE_LABEL = {
  requires: '前提', contrasts: '対比', leadsTo: '発展', elaborates: '深掘り',
};

// ノードから出ていく先を、理由ごと取り出す。
// 本文の [[リンク]] だけでなく、種別ごとの構造（章の型付きエッジ・束のセクション・
// 定点の構成員）も同じ「道」として扱う——読者にとっては同じ「次に行ける場所」だからだ。
export function outbound(node, idx, byRoute) {
  const out = [];
  const push = (target, reason) => {
    const r = typeof target === 'string' ? resolveTarget(target, idx) : target;
    if (!r || r.route === node.route) return;
    out.push({ route: r.route, reason: reason || '' });
  };

  switch (node.type) {
    case 'concept': {
      const E = node.ref.edges || {};
      for (const k of ['requires', 'contrasts', 'leadsTo', 'elaborates']) {
        for (const t of E[k] || []) push(t, EDGE_LABEL[k]);
      }
      for (const t of node.ref.notes || []) push(t, 'ここから覚える一片へ');
      break;
    }
    case 'moc':
      for (const s of node.ref.sections || []) {
        for (const it of s.items || []) push(it.target, it.reason || s.title);
      }
      break;
    case 'follow':
      for (const e of node.ref.entities || []) {
        push({ route: `/follow/${node.slug}/player/${e.slug}` }, [e.role, e.club].filter(Boolean).join(' · '));
      }
      for (const s of node.ref.sessions || []) {
        push({ route: `/follow/${node.slug}#${s.date}` }, `${s.date} の観測`);
      }
      break;
    case 'atlas':
      for (const c of node.ref.concepts || []) {
        push({ route: `/atlas/${node.slug}/concept/${c.slug}` }, c.status === 'stub' ? 'まだ書かれていない' : c.gist);
      }
      break;
    case 'logtopic':
      for (const e of node.ref.entries || []) push({ route: `/log/${node.slug}/entry/${e.slug}` }, '');
      break;
    default:
      break;
  }
  // どの種別でも本文中の [[リンク]] は道になる
  for (const { target, reason } of linksWithReason(node.body)) push(target, reason);

  const seen = new Set();
  return out.filter((o) => {
    if (seen.has(o.route) || !byRoute.has(o.route)) return false;
    seen.add(o.route);
    return true;
  });
}

// ---- 種別ごとの構造化表示 ----

function Metric({ s }) {
  const vals = s.points.map((p) => p.value);
  const last = vals[vals.length - 1];
  const cls = !s.goal || vals.length < 2 ? 'neu'
    : (s.goal === 'up' ? last >= vals[0] : last <= vals[0]) ? 'good' : 'warn';
  return (
    <div className="fd-metric">
      <span className="fd-metric-key">{s.key}{s.goal ? '' : '（良し悪しは決めていない）'}</span>
      <span className="fd-metric-spark"><Sparkline points={s.points} height={18} goal={s.goal} /></span>
      <span className={`fd-metric-val ${cls}`}>{last}</span>
    </div>
  );
}

function Follow({ node }) {
  const f = node.ref;
  return (
    <>
      {f.goal && <p className="fd-lede"><b>ねらい</b> {f.goal}</p>}
      {(f.snapshot || []).length > 0 && (
        <ul className="fd-list">{f.snapshot.map((s) => <li key={s}>{s}</li>)}</ul>
      )}
      {(f.series || []).map((s) => <Metric key={s.key} s={s} />)}
      {(f.focus || []).length > 0 && (
        <>
          <p className="fd-lede"><b>いま見ているところ</b></p>
          <ul className="fd-list">
            {f.focus.map((x) => (
              <li key={x.title}><b>{x.title}</b>{x.priority ? ' ★' : ''}{x.note ? <><br />{x.note}</> : null}</li>
            ))}
          </ul>
        </>
      )}
      {(f.coach || f.formation) && (
        <p className="fd-lede">{[f.coach && `監督 ${f.coach}`, f.formation && `並び ${f.formation}`].filter(Boolean).join(' · ')}</p>
      )}
      {(f.rivals || []).length > 0 && (
        <p className="fd-lede"><b>好敵手</b> {f.rivals.map((r) => `${r.name}（${r.note}）`).join('、')}</p>
      )}
      <Md text={f.body} />
    </>
  );
}

function Entity({ node }) {
  const e = node.ref;
  return (
    <>
      <p className="fd-lede">{[e.role, e.club, e.status === 'injured' ? '離脱中' : null].filter(Boolean).join(' · ')}</p>
      {(e.strengths || []).length > 0 && (
        <><p className="fd-lede"><b>強み</b></p><ul className="fd-list">{e.strengths.map((s) => <li key={s}>{s}</li>)}</ul></>
      )}
      {(e.developing || []).length > 0 && (
        <><p className="fd-lede"><b>いま伸ばしているところ</b></p><ul className="fd-list">{e.developing.map((s) => <li key={s}>{s}</li>)}</ul></>
      )}
      {(e.changelog || []).length > 0 && (
        <><p className="fd-lede"><b>うつりかわり</b></p>
          <ul className="fd-list">{e.changelog.map((c) => <li key={c.date + c.note}><b>{c.date}</b> {c.note}</li>)}</ul></>
      )}
      <Md text={e.body} />
    </>
  );
}

function LogEntry({ node }) {
  const fields = node.parent?.fields || [];
  const v = node.ref.fields || {};
  return (
    <>
      {fields.map((f) => {
        const val = v[f.key];
        if (val === undefined || val === null || val === '') return null;
        const disp = Array.isArray(val) ? val.join('・')
          : f.type === 'rating' ? '★'.repeat(val) + '☆'.repeat(Math.max(0, (f.max || 5) - val))
          : f.type === 'bool' ? (val ? 'はい' : 'いいえ')
          : `${val}${f.unit || ''}`;
        return (
          <div className="fd-metric" key={f.key}>
            <span className="fd-metric-key">{f.label}</span>
            <span className="fd-metric-val neu">{disp}</span>
          </div>
        );
      })}
      <Md text={node.body} />
    </>
  );
}

function LogTopic({ node }) {
  const t = node.ref;
  return (
    <>
      <p className="fd-lede">
        <b>記録している項目</b> {(t.fields || []).map((f) => f.label + (f.required ? '*' : '')).join(' / ')}
      </p>
      <Md text={node.body} />
      {(t.entries || []).length < 2 && (
        <p className="fd-dim">並べて比べられるのは2件目から。次の1件を頼むなら下の欄へ。</p>
      )}
    </>
  );
}

function Concept({ node }) {
  const c = node.ref;
  return (
    <>
      {c.gist && <p className="fd-lede"><b>要旨</b> {c.gist}</p>}
      {c.status === 'stub'
        ? <p className="fd-dim">この章はまだ書かれていない。順路の上には置いてある。</p>
        : <Md text={c.body} />}
    </>
  );
}

function Atlas({ node, onPeek }) {
  const a = node.ref;
  return (
    <>
      <Md text={a.body} />
      {(a.routes || []).map((r) => (
        <div key={r.id} className="fd-route">
          <p className="fd-lede"><b>{r.label}</b><br />{r.desc}</p>
          <ol className="fd-list fd-ordered">
            {r.order.map((sl, i) => {
              const c = a.concepts.find((x) => x.slug === sl);
              if (!c) return null;
              return (
                <li key={sl}>
                  <button type="button" className="fd-link"
                    onClick={() => onPeek(`/atlas/${a.slug}/concept/${sl}`, `${r.label} の ${i + 1}番目`)}>
                    {i + 1}. {c.title}{c.status === 'stub' ? '（未執筆）' : ''}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </>
  );
}

export function DetailBody({ node, onPeek, today }) {
  switch (node.type) {
    case 'follow': return <Follow node={node} />;
    case 'entity': return <Entity node={node} />;
    case 'concept': return <Concept node={node} />;
    case 'atlas': return <Atlas node={node} onPeek={onPeek} />;
    case 'logtopic': return <LogTopic node={node} />;
    case 'logentry': return <LogEntry node={node} />;
    case 'session': return (
      <>
        {node.ref.summary && <p className="fd-lede">{node.ref.summary}</p>}
        <Md text={node.body} />
      </>
    );
    default: return (
      <>
        {node.type === 'note' && (
          <p className="fd-chips">
            {(node.tags || []).map((t) => <span className="fd-chip" key={t}>{tagLabel(t)}</span>)}
            {node.updated && <span className="fd-chip">{relDay(node.updated, today)}に更新</span>}
            {node.kind === 'insight' && <span className="fd-chip">じぶんの言葉</span>}
          </p>
        )}
        <Md text={node.body} />
      </>
    );
  }
}

export const nodeLabel = (node) => typeLabel(node.type);
