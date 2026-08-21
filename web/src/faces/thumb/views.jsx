// 見る領域（上7割）の中身。**ここに操作要素は1つも置かない**——ボタンも、戻るも、リンクも。
// 跳ぶ手段はすべて下の帯にある。組版は面ごとに変える（カード／帯グラフ／行リスト／数値グリッド）。
import ReactMarkdown from 'react-markdown';
import { Sparkline } from '../../shared/Sparkline.jsx';
import { relDay } from '../../shared/util.js';
import { cleanTitle, shortTitle } from '../../lib/graph.js';
import { resolveTarget } from '../../lib/wiki.js';
import { kindOf, plain, previewOf, shelfBars, tagJa, wikiToPlainText } from './model.js';

const HUD = '#ffc46b';
const PATHC = '#7fd1e8';

// 本文の [[リンク]] と markdown リンクは「読める語」にだけする。
// この面の上7割は読むためだけの場所なので、押せるものを1つも置かない（受け入れ条件1）。
const Span = ({ children }) => <span className="tb-exlink">{children}</span>;
export function ThumbMd({ text, idx }) {
  if (!text) return null;
  return (
    <div className="tb-md">
      <ReactMarkdown components={{ a: Span, img: () => null }}>{wikiToPlainText(text, idx)}</ReactMarkdown>
    </div>
  );
}

const Kick = ({ children, note }) => (
  <div className="tb-kick"><b>{children}</b><i />{note ? <span>{note}</span> : null}</div>
);

const Rows = ({ children }) => <div className="tb-rows">{children}</div>;
const Row = ({ on, k, children }) => (
  <div className={`tb-row${on ? ' is-on' : ''}`}>
    {k ? <span className="tb-rowk">{k}</span> : null}
    <div className="tb-rowt">{children}</div>
  </div>
);

// ---------------- 道（理由つきの被リンク） ----------------
function Paths({ items, item }) {
  const ins = items.filter((x) => x.path?.dir === 'in');
  const outs = items.filter((x) => x.path?.dir === 'out');
  const grp = (title, arr, note) => (arr.length ? (
    <div className="tb-grp" key={title}>
      <Kick note={note}>{title}</Kick>
      {arr.map((x) => (
        <div key={`${title}:${x.path.node.route}`} className={`tb-path${item === x ? ' is-on' : ''}`}>
          <span className="tb-arrow" aria-hidden="true">{x.path.dir === 'in' ? '←' : '→'}</span>
          <div className="tb-pathb">
            <div className="tb-why">{x.path.reason || '（理由は書かれていない）'}</div>
            <div className="tb-to">{shortTitle(x.path.node.title)} <span className="tb-tokind">{kindOf(x.path.node)}</span></div>
          </div>
        </div>
      ))}
    </div>
  ) : null);
  return (
    <>
      {grp('ここへ来る道', ins, `${ins.length}本 — 向こうが書いた理由`)}
      {grp('ここから伸びる道', outs, `${outs.length}本`)}
    </>
  );
}

// ---------------- 今日 ----------------
function Today({ ctx, item, items }) {
  const { cards, judged, flipped, idx, graph, extra } = ctx;
  if (item?.card) {
    const c = cards.find((x) => x.note.slug === item.card);
    const i = cards.findIndex((x) => x.note.slug === item.card);
    const n = c.note;
    const v = judged[n.slug];
    const open = flipped || !!v;
    const paths = (graph.backlinks.get(`/note/${n.slug}`)?.length || 0) + (extra.get(`/note/${n.slug}`)?.length || 0);
    return (
      <>
        <Kick note={`${i + 1} / ${cards.length} 枚目`}>今日</Kick>
        <div className="tb-card">
          <div className="tb-meta">
            {(n.tags || []).slice(0, 1).map((t) => <span key={t} className="tb-tag">{tagJa(t)}</span>)}
            <span>{relDay(n.srs?.last || n.created, ctx.today)}</span>
          </div>
          <div className="tb-q">{n.recall || n.title}</div>
          {!open ? (
            <p className="tb-qhint">
              頭の中で答えてから、左下の原点をぽんと叩く。<br />
              答えが出たら原点が2つに割れる。左＝あやしい／右＝わかった。
            </p>
          ) : (
            <div className="tb-ans">
              <div className="tb-anst">{n.title}</div>
              <ThumbMd text={n.body} idx={idx} />
              {v ? (
                <p className={`tb-verdict${v === 'ok' ? ' is-ok' : ' is-fz'}`}>
                  {v === 'ok'
                    ? '✓「わかった」として記録した。次に出るまでの間隔が伸びる'
                    : '△「あやしい」として記録した。近いうちにまた出る'}
                </p>
              ) : (
                <p className="tb-qhint">この記事には道が {paths} 本ある。判定してから、あらためて開けばたどれる。</p>
              )}
            </div>
          )}
        </div>
      </>
    );
  }
  if (item?.act?.t === 'more') {
    return (
      <>
        <Kick note="おかわり">今日</Kick>
        <h1 className="tb-h1">今日の分は、ここまでで足りている。</h1>
        <p className="tb-lead">
          それでも続けたいときだけ、原点を叩くと次の5枚が出る。<br />
          並び順は日付から決まっているので、何度開いても今日は同じ順番。引き直しはできない。
        </p>
      </>
    );
  }
  const pv = item?.act?.t === 'go' ? previewOf(ctx.graph.byRoute.get(item.act.s.route), ctx.graph) : null;
  return (
    <>
      <Kick note="余白">今日</Kick>
      {pv ? (
        <>
          <h1 className="tb-h1">{pv.title}</h1>
          <div className="tb-meta"><span className="tb-tag">{pv.kind}</span><span>{pv.sub}</span></div>
          <p className="tb-lead">{pv.ex}</p>
        </>
      ) : (
        <p className="tb-lead">今日の分は、ぜんぶ終わっている。</p>
      )}
      {items.length ? null : <p className="tb-lead">期日の来た記事が無い。原点を引いて別の場所へ。</p>}
    </>
  );
}

// ---------------- 見渡す ----------------
function Shelf({ ctx, item }) {
  const { graph, site } = ctx;
  const { head, rest, restN, max } = shelfBars(graph);
  const total = site.notes.length;
  const topShare = head[0] ? Math.round((head[0].count / total) * 100) : 0;
  const others = [
    ['連載', `${(site.atlases || []).length}本 — 順路つきの読み物`],
    ['定点', `${site.follows.length}つ — 同じ条件で見つづける`],
    ['記録帖', `${(site.logtopics || []).length}冊 — 同じ項目で並べて比べる`],
    ['見取り図', `${site.mocs.length}枚 — 手で並べた索引`],
  ];
  return (
    <>
      <Kick note="いま手元にあるもの">見渡す</Kick>
      <div className="tb-bars">
        {head.map((t) => (
          <div key={t.tag} className={`tb-bar${item?.tag === t.tag ? ' is-on' : ''}`}>
            <span className="tb-fill" style={{ width: `${(t.count / max) * 100}%` }} />
            <span className="tb-barn">{t.label}</span>
            <span className="tb-barc">{t.count}</span>
          </div>
        ))}
        {rest.length > 0 && (
          <div className="tb-bar is-other">
            <span className="tb-fill" style={{ width: `${(restN / max) * 100}%` }} />
            <span className="tb-barn">その他 {rest.length}テーマ</span>
            <span className="tb-barc">{restN}</span>
          </div>
        )}
      </div>
      <p className="tb-lead">
        記事は全部で {total} 本。うち {topShare}% が{head[0]?.label}。<br />
        この偏りは事実なので、均等には並べない。
      </p>
      <div className="tb-grp">
        <Kick>ほかの棚</Kick>
        <Rows>{others.map(([k, d]) => <Row key={k} k={k} on={item?.k === k}>{d}</Row>)}</Rows>
      </div>
    </>
  );
}

// ---------------- 探す ----------------
function Search({ ctx, item, items }) {
  const q = (ctx.query || '').trim();
  if (!q) {
    return (
      <>
        <Kick note="あれ何だっけ">探す</Kick>
        <h1 className="tb-h1">思い出したい語を、下に打つ。</h1>
        <p className="tb-lead">
          打つそばから、記事・章・定点・人物・記録の全部から絞り込む。<br />
          全部が手元にあるので、待ち時間は無い。
        </p>
        <p className="tb-lead"><b style={{ color: HUD }}>見つからなかったときが本番。</b><br />
          その語は muninn にまだ無いということ。そのまま Claude への依頼に変わる。
        </p>
        {ctx.seen.length > 0 && (
          <div className="tb-grp">
            <Kick>最近ひらいたもの</Kick>
            <Rows>{ctx.seen.slice(0, 5).map((s) => <Row key={s.route}>{s.title}</Row>)}</Rows>
          </div>
        )}
      </>
    );
  }
  const hits = items.filter((x) => x.hit);
  if (!hits.length) {
    return (
      <>
        <Kick note={`「${q}」`}>探す</Kick>
        <h1 className="tb-h1">「{q}」は、まだ手元に無い。</h1>
        <p className="tb-lead">
          無いという事実が、次に貯めるものを決める。<br />
          原点を叩くと、この語を調べてもらう依頼が伝票に乗る。
        </p>
      </>
    );
  }
  return (
    <>
      <Kick note={`「${q}」 ${hits.length}件`}>探す</Kick>
      <Rows>
        {hits.slice(0, 20).map((x) => (
          <Row key={x.hit.node.route} k={kindOf(x.hit.node)} on={item === x}>
            {shortTitle(x.hit.node.title)}
            {x.hit.snip && (
              <div className="tb-rowr">
                {x.hit.snip.pre}<b>{x.hit.snip.hit}</b>{x.hit.snip.post}
              </div>
            )}
          </Row>
        ))}
      </Rows>
      {hits.length > 20 && <p className="tb-trunc">ほか {hits.length - 20}件</p>}
    </>
  );
}

// ---------------- 頼む ----------------
function Ask({ ctx, item }) {
  const { slips, pending, docketText } = ctx;
  if (!slips.length && !pending.length) {
    return (
      <>
        <Kick note="Claude に渡す伝票">頼む</Kick>
        <h1 className="tb-h1">伝票は、まだ空。</h1>
        <p className="tb-lead">
          ここは書き込む場所ではない。書くのは手元の Claude Code で、ここは
          <b style={{ color: HUD }}>頼みごとを溜めておく紙</b>。<br />
          読んでいて足りないと思ったところで、原点を <b style={{ color: HUD }}>↑ 頼む</b> に引けば、
          いま見ているものが依頼に付いてくる。<br />
          溜まったらコピーして、Mac の前で貼る。
        </p>
      </>
    );
  }
  return (
    <>
      <Kick note="Claude に渡す伝票">頼む</Kick>
      {/* 件数は行のほうに持たせる。h1 で足し算した数を出すと「1件」の中身が読めない */}
      <h1 className="tb-h1">伝票にたまっているもの</h1>
      <Rows>
        {pending.length > 0 && (
          <Row k="答え合わせ" on={!!item?.pending}>再読の結果 {pending.length}件</Row>
        )}
        {slips.map((s, i) => (
          <Row key={s.id} k={String(i + 1)} on={item?.slip?.id === s.id}>{s.label}</Row>
        ))}
      </Rows>
      <div className="tb-grp">
        <Kick>コピーされる文</Kick>
        <pre className="tb-pre">{docketText}</pre>
      </div>
    </>
  );
}

// ---------------- テーマ ----------------
function Theme({ ctx, item, scene }) {
  const list = (ctx.graph.tags.find((t) => t.tag === scene.tag)?.nodes || [])
    .slice().sort((a, b) => ((a.updated || '') < (b.updated || '') ? 1 : -1));
  return (
    <>
      <Kick note={`${list.length}本`}>{tagJa(scene.tag)}</Kick>
      <Rows>
        {list.map((n) => (
          <Row key={n.route} k={kindOf(n)} on={item?.node?.route === n.route}>
            {shortTitle(n.title)}
            <div className="tb-rowr">{relDay(n.updated, ctx.today)}に更新</div>
          </Row>
        ))}
      </Rows>
    </>
  );
}

// ---------------- 記事・気づき ----------------
function NoteView({ ctx, node, item, items }) {
  const n = node.ref;
  return (
    <>
      <Kick note={`${relDay(node.updated, ctx.today)}に更新`}>{kindOf(node)}</Kick>
      <h1 className="tb-h1">{node.title}</h1>
      <div className="tb-meta">
        {(n.tags || []).map((t) => <span key={t} className="tb-tag">{tagJa(t)}</span>)}
        <span>書いた日 {n.created}</span>
      </div>
      {n.recall && <p className="tb-quote">問い： {n.recall}</p>}
      <ThumbMd text={node.body} idx={ctx.idx} />
      {items.some((x) => x.path) ? <Paths items={items} item={item} />
        : (
          <div className="tb-grp">
            <Kick>道</Kick>
            <p className="tb-lead">この記事には、まだ来る道も伸びる道も無い。<br />原点を叩けば「道を引いてほしい」と伝票に頼める。</p>
          </div>
        )}
    </>
  );
}

// ---------------- 章 ----------------
function ConceptView({ ctx, node, item, items }) {
  const c = node.ref;
  const a = node.parent;
  return (
    <>
      <Kick note={c.status === 'stub' ? 'この章はまだ書かれていない' : 'この章は書けている'}>
        連載「{cleanTitle(a.title)}」
      </Kick>
      <h1 className="tb-h1">{shortTitle(c.title)}</h1>
      <p className="tb-lead">{c.gist}</p>
      {a.routes.map((r) => {
        const i = r.order.indexOf(c.slug);
        if (i < 0) return null;
        return (
          <div className="tb-grp" key={r.id}>
            <Kick note={`${i + 1} / ${r.order.length}`}>{r.label}</Kick>
            <Rows>
              {r.order.map((cs, j) => {
                const cc = a.concepts.find((x) => x.slug === cs);
                if (!cc) return null;
                return (
                  <Row key={cs} k={String(j + 1)} on={j === i}>
                    {shortTitle(cc.title)}
                    {cc.status === 'stub' && <div className="tb-rowr">まだ書かれていない</div>}
                  </Row>
                );
              })}
            </Rows>
          </div>
        );
      })}
      {c.status !== 'stub' && node.body && (
        <div className="tb-grp"><Kick>本文</Kick><ThumbMd text={node.body} idx={ctx.idx} /></div>
      )}
      <Paths items={items} item={item} />
    </>
  );
}

// ---------------- 連載 ----------------
function AtlasView({ ctx, node, item }) {
  const a = node.ref;
  return (
    <>
      <Kick note={`${a.concepts.length}章 / 順路${a.routes.length}本`}>連載</Kick>
      <h1 className="tb-h1">{cleanTitle(a.title)}</h1>
      <p className="tb-lead">{plain(node.body, 180)}</p>
      {a.routes.map((r) => (
        <div className="tb-grp" key={r.id}>
          <Kick note={item?.route?.id === r.id ? 'いま選んでいる順路' : ''}>{r.label}</Kick>
          <p className="tb-lead">{r.desc}</p>
          <Rows>
            {r.order.map((cs, j) => {
              const cc = a.concepts.find((x) => x.slug === cs);
              if (!cc) return null;
              return (
                <Row key={cs} k={String(j + 1)} on={item?.concept?.slug === cs}>
                  {shortTitle(cc.title)}
                  {cc.status === 'stub' && <div className="tb-rowr">まだ書かれていない</div>}
                  {ctx.reads[a.slug]?.has(cs) && <div className="tb-rowr">読んだ</div>}
                </Row>
              );
            })}
          </Rows>
        </div>
      ))}
    </>
  );
}

// ---------------- 定点 ----------------
function FollowView({ ctx, node, item, items }) {
  const f = node.ref;
  return (
    <>
      <Kick note={f.followType === 'goal' ? 'よくなりたい' : 'もっと楽しみたい'}>定点</Kick>
      <h1 className="tb-h1">{cleanTitle(f.title)}</h1>
      <p className="tb-lead">{f.goal}</p>
      {f.snapshot?.length > 0 && (
        <div className="tb-grp"><Kick>いまの姿</Kick>
          <ul className="tb-ul">{f.snapshot.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {f.series?.length > 0 && (
        <div className="tb-grp"><Kick note="良し悪しは正本の宣言に従う">数字</Kick>
          <div className="tb-mets">
            {f.series.map((s) => {
              const last = s.points[s.points.length - 1];
              const prev = s.points[s.points.length - 2];
              const d = prev ? Math.round((last.value - prev.value) * 100) / 100 : null;
              const good = s.goal ? ((s.goal === 'up') === (d > 0)) : null;
              return (
                <div className="tb-met" key={s.key}>
                  <div className="tb-metk">{s.key}</div>
                  <div className="tb-metv">{last.value}</div>
                  <div className={`tb-metd${good === null ? '' : good ? ' is-good' : ' is-bad'}`}>
                    {d == null ? '—' : `${d > 0 ? '+' : ''}${d}`} ／ {s.goal === 'up' ? '大きいほど良い' : s.goal === 'down' ? '小さいほど良い' : '良し悪しは決めていない'}
                  </div>
                  <Sparkline points={s.points} height={30} color={s.goal ? HUD : '#616b78'} goal={s.goal} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {f.focus?.length > 0 && (
        <div className="tb-grp"><Kick>重点</Kick>
          <Rows>{f.focus.map((x) => (
            <Row key={x.title} k={x.priority ? '最優先' : ''}>{x.title}
              {x.note && <div className="tb-rowr">{x.note}</div>}
            </Row>
          ))}</Rows>
        </div>
      )}
      {f.entities?.length > 0 && (
        <div className="tb-grp"><Kick note={`${f.entities.length}人`}>顔ぶれ</Kick>
          <Rows>{f.entities.map((e) => (
            <Row key={e.slug} k={e.group} on={item?.ent?.slug === e.slug}>
              {cleanTitle(e.title)}
              <div className="tb-rowr">{e.role} / {e.club}{e.status === 'injured' ? ' — いま離脱中' : ''}</div>
            </Row>
          ))}</Rows>
        </div>
      )}
      {f.rivals?.length > 0 && (
        <div className="tb-grp"><Kick>相手</Kick>
          <Rows>{f.rivals.map((r) => (
            <Row key={r.name} k="相手">{r.name}{r.note && <div className="tb-rowr">{r.note}</div>}</Row>
          ))}</Rows>
        </div>
      )}
      <Paths items={items} item={item} />
    </>
  );
}

function SessionView({ ctx, node, item, items }) {
  const f = node.parent;
  const s = node.ref;
  const i = f.sessions.indexOf(s);
  const prev = f.sessions[i + 1];
  return (
    <>
      <Kick note={cleanTitle(f.title)}>観測</Kick>
      <h1 className="tb-h1">{s.date}</h1>
      {s.summary && <p className="tb-lead">{s.summary}</p>}
      {s.metrics && (
        <div className="tb-mets">
          {Object.keys(s.metrics).map((k) => {
            const ser = (f.series || []).find((x) => x.key === k);
            const goal = ser?.goal || null;
            const d = prev?.metrics?.[k] != null ? Math.round((s.metrics[k] - prev.metrics[k]) * 100) / 100 : null;
            const good = goal && d != null && d !== 0 ? ((goal === 'up') === (d > 0)) : null;
            return (
              <div className="tb-met" key={k}>
                <div className="tb-metk">{k}</div>
                <div className="tb-metv">{s.metrics[k]}</div>
                <div className={`tb-metd${good === null ? '' : good ? ' is-good' : ' is-bad'}`}>
                  {d == null ? '—' : `${d > 0 ? '+' : ''}${d}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ThumbMd text={node.body} idx={ctx.idx} />
      <Paths items={items} item={item} />
    </>
  );
}

function EntityView({ ctx, node, item, items }) {
  const e = node.ref;
  const f = node.parent;
  return (
    <>
      <Kick note={e.group}>{cleanTitle(f.title)}</Kick>
      <h1 className="tb-h1">{cleanTitle(e.title)}</h1>
      <div className="tb-meta">
        <span className="tb-tag">{e.role}</span><span>{e.club}</span>
        {e.status === 'injured' && <span className="tb-warn">いま離脱中</span>}
      </div>
      {e.strengths?.length > 0 && (
        <div className="tb-grp"><Kick>強み</Kick><ul className="tb-ul">{e.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>
      )}
      {e.developing?.length > 0 && (
        <div className="tb-grp"><Kick>伸ばしている点</Kick><ul className="tb-ul">{e.developing.map((x) => <li key={x}>{x}</li>)}</ul></div>
      )}
      {e.changelog?.length > 0 && (
        <div className="tb-grp"><Kick>移り変わり</Kick>
          <Rows>{e.changelog.map((c) => <Row key={`${c.date}${c.note}`} k={c.date}>{c.note}</Row>)}</Rows>
        </div>
      )}
      <ThumbMd text={node.body} idx={ctx.idx} />
      <Paths items={items} item={item} />
    </>
  );
}

// ---------------- 記録帖 ----------------
function LogTopicView({ ctx, node, item }) {
  const t = node.ref;
  return (
    <>
      <Kick note={`${t.entries.length}件`}>記録帖</Kick>
      <h1 className="tb-h1">{cleanTitle(t.title)}</h1>
      <p className="tb-lead">
        記録する項目は最初に決めてある： {t.fields.map((f) => f.label).join('・')}。<br />
        同じ項目で貯めるから、あとで並べて比べられる。
      </p>
      <Rows>
        {t.entries.map((e) => (
          <Row key={e.slug} k={e.fields?.rating ? `★${e.fields.rating}` : ''} on={item?.entry?.slug === e.slug}>
            {e.title}
            <div className="tb-rowr">
              {t.fields.slice(0, 3).map((f) => e.fields?.[f.key])
                .filter((v) => v != null && v !== '')
                .map((v) => (Array.isArray(v) ? v.join('・') : String(v))).join(' / ')}
            </div>
          </Row>
        ))}
      </Rows>
      {t.entries.length < 3 && (
        <div className="tb-grp"><Kick>比べるにはまだ薄い</Kick>
          <p className="tb-lead">記録が{t.entries.length}件では、並べても比べられない。<br />原点を叩けば「次も記録して」と伝票に頼める。</p>
        </div>
      )}
    </>
  );
}

function LogEntryView({ ctx, node }) {
  const t = node.parent;
  const e = node.ref;
  return (
    <>
      <Kick note={e.created}>{cleanTitle(t.title)}</Kick>
      <h1 className="tb-h1">{e.title}</h1>
      <div className="tb-mets">
        {t.fields.map((f) => {
          let v = e.fields?.[f.key];
          if (v == null || v === '') return null;
          if (Array.isArray(v)) v = v.join('・');
          if (typeof v === 'boolean') v = v ? 'はい' : 'いいえ';
          if (f.type === 'rating') v = '★'.repeat(v) + '☆'.repeat((f.max || 5) - v);
          return (
            <div className="tb-met" key={f.key}>
              <div className="tb-metk">{f.label}</div>
              <div className="tb-metv is-sm">{String(v)}{f.unit ? ` ${f.unit}` : ''}</div>
            </div>
          );
        })}
      </div>
      <ThumbMd text={node.body} idx={ctx.idx} />
    </>
  );
}

// ---------------- 見取り図 ----------------
function MocView({ ctx, node, item }) {
  const m = node.ref;
  return (
    <>
      <Kick note="手で並べた索引">見取り図</Kick>
      <h1 className="tb-h1">{cleanTitle(m.title)}</h1>
      {(m.sections || []).map((sec) => (
        <div className="tb-grp" key={sec.title}>
          <Kick>{sec.title}</Kick>
          <Rows>
            {sec.items.map((it) => {
              // 索引に並んでいるのは slug。読者に slug を見せない（内部語彙を画面に出さない）
              const r = resolveTarget(it.target, ctx.idx);
              const to = r && ctx.graph.byRoute.get(r.route);
              if (!to) return null;
              return (
                <Row key={it.target} k={kindOf(to)} on={item?.path?.node?.route === to.route}>
                  {it.alias || shortTitle(to.title)}
                  {it.reason && <div className="tb-rowr">{it.reason}</div>}
                </Row>
              );
            })}
          </Rows>
        </div>
      ))}
    </>
  );
}

// ---------------- 振り分け ----------------
const NODE_VIEWS = {
  concept: ConceptView, atlas: AtlasView, follow: FollowView, session: SessionView,
  entity: EntityView, logtopic: LogTopicView, logentry: LogEntryView, moc: MocView,
};

export function View({ scene, ctx, item, items }) {
  if (scene.t === 'today') return <Today ctx={ctx} item={item} items={items} />;
  if (scene.t === 'shelf') return <Shelf ctx={ctx} item={item} />;
  if (scene.t === 'search') return <Search ctx={ctx} item={item} items={items} />;
  if (scene.t === 'ask') return <Ask ctx={ctx} item={item} />;
  if (scene.t === 'theme') return <Theme ctx={ctx} item={item} scene={scene} />;
  const node = ctx.graph.byRoute.get(scene.route);
  if (!node) return <p className="tb-lead">この対象は見つからない。原点を下へ引けば戻せる。</p>;
  const C = NODE_VIEWS[node.type] || NoteView;
  return <C ctx={ctx} node={node} item={item} items={items} />;
}

export { PATHC };
