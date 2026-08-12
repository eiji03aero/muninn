// 面「一本の欄」。
//
// この面には**タブもページ遷移も無い**。あるのは一枚の面と、下端に常駐する一本の欄だけで、
// 面の中身は「欄に何が入っているか」だけで決まる（Notational Velocity / Raskin の quasimode）。
// 欄を消せば必ず元の面に戻るので、トグル型のモードが存在しない。
//
// 並びの法則はひとつ——**欄に近いものほど強い**。結果も今日の紙面も欄の真上から上へ積む。
// 「一番強いもの＝親指のいちばん近く＝ソフトキーボードの直上」が構造的に保証される。
// この法則は views.jsx の「配列は欄に近い順」という約束で担保し、ここでは reverse するだけ。
//
// そして、打って見つからなければ**そのまま Claude への依頼になる**。muninn に無かったという
// 事実そのものが、次の蓄積の入口になる。

import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { useShell } from '../../shell/ctx.js';
import { useData } from '../../lib/ctx.js';
import { Md } from '../../shared/Md.jsx';
import { copyText } from '../../shared/util.js';
import { composeEdition, recallQueue } from '../../lib/edition.js';
import {
  todayISO, doneThisWeek, recallLog, markSeen, loadSeen,
  recordVerdict, undoVerdict,
  loadSlips, addSlip, removeSlip, clearSlips, clearPending, restorePending, loadPending, slipsPrompt,
  loadRead, saveRead,
} from '../../lib/recall.js';
import { buildItems, search, marks, plain, displayTitle } from './items.js';
import {
  viewHome, viewFind, viewShelf, viewAsk, viewHelp, TEMPLATES, HELP_ROWS,
} from './views.jsx';
import { DetailBody, outbound, nodeLabel } from './detail.jsx';
import './field.css';

// 面固有の状態はここ1つだけ。想起・伝票・読了は面をまたぐ資産なので lib の共有キーを使い、
// 面ごとの枝を生やさない（面を替えたら積み上げが消える、を起こさないため）。
const KEY_INTRO = 'mn.face.field.intro';

// いまどの状態かを、色・記号・文言の3チャネルで常時見せる（暗黙のモードを作らないため）。
// 記号は打った記号の複写ではなく**状態の絵**にする（`> >量子…` のように二重に見えるのを避ける）。
const STATES = {
  home: { caret: '›', tone: 'idle', word: '' },
  detail: { caret: '›', tone: 'idle', word: '消せば戻る' },
  find: { caret: '›', tone: 'find', word: '絞り込んでいる' },
  zero: { caret: '!', tone: 'zero', word: 'muninn の外' },
  shelf: { caret: '≡', tone: 'shelf', word: '束ねている' },
  ask: { caret: '»', tone: 'ask', word: '頼んでいる' },
  help: { caret: 'i', tone: 'help', word: '使い方' },
  memo: { caret: '…', tone: 'memo', word: 'こたえを書いている' },
};

const PLACEHOLDER = {
  memo: '思い出したことを一言（書かなくてもよい）',
  default: '打てば探す　#で束ねる　>で頼む',
};

export default function FieldRoot({ initialTarget }) {
  const { openSettings } = useShell();
  const { site, idx, graph, shadow, reads, refresh } = useData();
  const today = todayISO();

  const [query, setQuery] = useState('');
  const [memo, setMemo] = useState('');
  const [trail, setTrail] = useState([]);
  const [riser, setRiser] = useState(null);      // {mode:'peek'|'paths', route, reason}
  const [flipped, setFlipped] = useState(false);
  const [extra, setExtra] = useState(0);
  const [skipped, setSkipped] = useState([]);
  const [last, setLast] = useState(null);        // 直前の判定（取り消し用に居座る）
  const [toast, setToast] = useState(null);
  const [askCtx, setAskCtx] = useState(null);
  const [sel, setSel] = useState(0);
  const [tick, setTick] = useState(0);           // 伝票の増減をこの面にも反映させる
  const [intro, setIntro] = useState(() => {
    try { return !localStorage.getItem(KEY_INTRO); } catch { return false; }
  });

  const fieldRef = useRef(null);
  const surfaceRef = useRef(null);
  const composing = useRef(false);
  const toastTimer = useRef(null);

  const items = useMemo(() => buildItems(graph), [graph]);

  // ---- 起動は必ず空欄の面から ----
  // ブラウザは戻る/bfcache 復帰で入力値を復元する。この面の主役は空欄の面なので、
  // 欄と足あとだけは毎回まっさらにする（判定履歴・伝票は残す）。
  useEffect(() => {
    const fresh = () => { setQuery(''); setMemo(''); setTrail([]); setRiser(null); setFlipped(false); };
    window.addEventListener('pageshow', fresh);
    return () => window.removeEventListener('pageshow', fresh);
  }, []);

  // ---- ソフトキーボード追従 ----
  // レイアウトビューポート（window.innerHeight）はキーボードで縮まない。visualViewport の
  // resize/scroll を購読して面の高さそのものを合わせる。ここがこの面の生命線。
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const sync = () => {
      document.documentElement.style.setProperty('--mn-field-vh', `${Math.round(vv.height)}px`);
      window.scrollTo(0, 0);
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      document.documentElement.style.removeProperty('--mn-field-vh');
    };
  }, []);

  // ---- ディープリンク ----
  // shell は hash が変わるたびに新しい target オブジェクトを渡してくる。同じ対象を
  // 続けて開いたときだけ積み増しを避ける（PWA を開いたまま共有リンクを踏む経路がある）。
  useEffect(() => {
    const r = initialTarget?.route;
    if (!r) return;
    setQuery(''); setRiser(null); setFlipped(false);
    setTrail((t) => (t[t.length - 1] === r ? t : [...t, r]));
  }, [initialTarget]);

  const bump = useCallback(() => setTick((t) => t + 1), []);

  const showToast = useCallback((msg, undo) => {
    const ms = undo ? 6000 : 2200;
    setToast({ msg, undo, ms, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const open = useCallback((route) => {
    const node = graph.byRoute.get(route);
    if (!node) return;
    markSeen(route, displayTitle(node));
    // 章を開いたら読了として数える。連載の「つづき」が前へ進むのはここ由来。
    const m = route.match(/^\/atlas\/([^/]+)\/concept\/([^/]+)$/);
    if (m) {
      const s = loadRead(m[1]);
      if (!s.has(m[2])) { s.add(m[2]); saveRead(m[1], s); refresh?.(); }
    }
    setTrail((t) => [...t, route]);
    setQuery(''); setMemo(''); setRiser(null); setFlipped(false);
  }, [graph, refresh]);

  const goBack = useCallback(() => {
    if (riser) { setRiser(null); return; }
    if (flipped) { setFlipped(false); setMemo(''); return; }
    if (query) { setQuery(''); setAskCtx(null); return; }
    setTrail((t) => t.slice(0, -1));
  }, [riser, flipped, query]);

  const api = useMemo(() => ({
    open,
    setQuery: (v) => { setQuery(v); setRiser(null); },
    peek: (route, reason) => setRiser({ mode: 'peek', route, reason }),
    copy: (text, msg) => { copyText(text); showToast(msg); },
    addAsk: (text) => {
      addSlip({
        id: `field:${text}`,
        kind: 'ask',
        label: text.replace(/^\/mn\s*/, '').slice(0, 44),
        intro: '/mn 以下は muninn のサイトの欄から溜めた依頼。順に片づけて。',
        line: text.replace(/^\/mn\s*/, ''),
      });
      setAskCtx(null); setQuery('>'); bump(); refresh?.();
      showToast(`伝票にためた（${loadSlips().length}件）`, () => { removeSlip(`field:${text}`); bump(); refresh?.(); });
    },
    dropSlip: (id) => { removeSlip(id); bump(); refresh?.(); },
    // 依頼も答え合わせも、Claude に渡し終わったら一緒に消える。
    // 消す側だけ用意して戻す側を用意しないと「半分だけ取り消せる」嘘のUndoになるので、両方戻す。
    emptySlips: () => {
      const oldSlips = loadSlips();
      const oldPending = loadPending();
      clearSlips(); clearPending(); bump(); refresh?.();
      showToast('渡し終わったものとして消した', () => {
        oldSlips.forEach(addSlip); restorePending(oldPending); bump(); refresh?.();
      });
    },
    reopenIntro: () => setIntro(true),
  }), [open, showToast, bump, refresh]);

  // ---- 欄の中身から面を決める（分岐は少なく、法則はひとつ） ----
  const inMemo = flipped;
  const raw = inMemo ? memo : query;
  const trimmed = query.trim();
  const findRes = useMemo(
    () => (!inMemo && trimmed && !/^[#>?]/.test(trimmed) ? search(items, trimmed) : []),
    [items, trimmed, inMemo],
  );

  const mode = inMemo ? 'memo'
    : query.startsWith('?') ? 'help'
    : query.startsWith('#') ? 'shelf'
    : query.startsWith('>') ? 'ask'
    : trimmed ? (findRes.length ? 'find' : 'zero')
    : trail.length ? 'detail'
    : 'home';

  const pinned = trail.length ? trail[trail.length - 1] : null;
  const node = mode === 'detail' ? graph.byRoute.get(pinned) : null;

  const edition = useMemo(
    () => composeEdition({ site, graph, shadow, reads, pendingCount: loadPending().length, today }),
    [site, graph, shadow, reads, today, tick],
  );
  const seen = useMemo(() => loadSeen(), [tick, trail.length]);
  const week = useMemo(() => doneThisWeek(), [tick, shadow]);

  const stack = useMemo(() => {
    switch (mode) {
      case 'help': return viewHelp({ api });
      case 'shelf': return viewShelf({ site, graph, rest: query.slice(1).trim(), api });
      case 'ask': return viewAsk({
        rest: query.slice(1).trim(), slips: loadSlips(), pending: loadPending(), ctx: askCtx, api,
      });
      case 'find':
      case 'zero': return viewFind({ items, str: trimmed, res: findRes, api });
      case 'detail': return [];
      default: return viewHome({ site, graph, edition, seen, week, api, today });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, query, trimmed, findRes, items, site, graph, edition, seen, week, api, today, askCtx, tick]);

  // 選べる項目に「欄に近い順」の番号を振る。0 が常に欄のいちばん近く。
  const numbered = useMemo(() => {
    let r = 0;
    return stack.map((x) => (x.act ? { ...x, row: r++ } : x));
  }, [stack]);
  const rows = useMemo(() => numbered.filter((x) => x.row !== undefined), [numbered]);

  useEffect(() => {
    const p = rows.findIndex((x) => x.pref);
    setSel(rows.length ? (p >= 0 ? p : 0) : -1);
  }, [rows]);

  // 上へ積む面では、描画のたびに下端へ寄せる（欄の真上が常に「いま」であるため）
  useLayoutEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    if (mode === 'detail') el.scrollTop = 0;
    else el.scrollTop = el.scrollHeight;
  }, [mode, stack, toast, riser]);

  // ---- 想起 ----
  const doneToday = useMemo(
    () => recallLog().filter((r) => r.date === today).map((r) => r.slug),
    [today, tick, shadow],
  );
  const queue = useMemo(
    () => recallQueue(site, graph, shadow, today, 3 + extra),
    [site, graph, shadow, today, extra],
  );
  // 「きょうの3枚」は最初に引いた3枚で固定する。判定すると影SRSが動いてキューから外れるので、
  // 毎回引き直すと進捗の点が永久に埋まらない（＝終わりの見えない借金に見える）。
  const threeRef = useRef(null);
  if (!threeRef.current && queue.length) threeRef.current = queue.slice(0, 3).map((c) => c.note.slug);
  const todaysThree = threeRef.current || [];
  const pending = queue.filter((c) => !doneToday.includes(c.note.slug) && !skipped.includes(c.note.slug));
  const current = pending[0]?.note || null;

  const judge = (ok) => {
    const prevShadow = shadow[current.slug];
    const wrote = memo.trim().length > 0;
    recordVerdict(current, ok, wrote, shadow);
    const label = ok ? (wrote ? 'わかった（一言つき）' : 'わかった') : 'あやしい';
    setLast({ slug: current.slug, title: current.title, label, prevShadow });
    setFlipped(false); setMemo(''); bump(); refresh?.();
    showToast(`${label} を記録した`, () => undo({ slug: current.slug, label, prevShadow }));
  };

  const undo = (l) => {
    const target = l || last;
    if (!target) return;
    undoVerdict(target.slug, target.prevShadow);
    setLast(null); setFlipped(true); bump(); refresh?.();
    setToast(null);
    showToast('取り消した');
  };

  // ---- 入力 ----
  const onChange = (e) => {
    const v = e.target.value;
    if (inMemo) setMemo(v);
    else { setQuery(v); setRiser(null); }
  };

  const onKeyDown = (e) => {
    // IME の変換確定 Enter を実行として扱わない（compositionend より先に keydown が来る環境がある）
    if (e.isComposing || composing.current || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inMemo) return;                 // こたえを書いている間は、Enter で何も起こさない
      rows[sel]?.act?.();
      return;
    }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) setSel((s) => Math.min(rows.length - 1, s + 1)); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (rows.length) setSel((s) => Math.max(0, s - 1)); return; }
    if (e.key === 'Escape') { e.preventDefault(); goBack(); }
  };

  // PC の実キーボードでは、どこを触っていても打てば欄に入る。
  // iOS では JS からの focus() が効かないので、これに依存した設計にはしない（受け入れ条件7）。
  useEffect(() => {
    const onKey = (e) => {
      if (e.target === fieldRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { setRiser(null); return; }
      if (e.key && e.key.length === 1) fieldRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const clear = () => {
    if (inMemo) { if (memo) setMemo(''); else setFlipped(false); return; }
    setQuery(''); setAskCtx(null); setRiser(null);
    fieldRef.current?.focus();
  };

  const st = STATES[mode];
  const backLive = !!(riser || flipped || query || trail.length);

  return (
    <div className={`face-field tone-${st.tone}`} data-face="field">
      <div className="ff-surface" ref={surfaceRef}>
        <div className="ff-topfade" />
        <div className={`ff-flow${mode === 'detail' ? ' reading' : ''}`}>
          {mode === 'detail' && node
            ? <Detail node={node} idx={idx} graph={graph} api={api} today={today}
                onAsk={() => { setAskCtx(displayTitle(node)); setQuery('>'); }} />
            : [...numbered].reverse().map((x) => (
              <StackItem key={x.key || x.k} x={x} sel={x.row === sel}
                recall={{
                  current, todaysThree, doneToday, last, memo, flipped,
                  onFlip: () => setFlipped(true),
                  onSkip: () => { setSkipped((s) => [...s, current.slug]); setFlipped(false); setMemo(''); },
                  onJudge: judge, onUndo: () => undo(), onMore: () => setExtra((n) => n + 1), week,
                  onOpen: () => open(`/note/${current.slug}`),
                }} />
            ))}
        </div>
      </div>

      <Riser riser={riser} node={node} graph={graph} api={api}
        onClose={() => setRiser(null)}
        onPaths={() => setRiser({ mode: 'paths' })}
        onAskPath={() => { setAskCtx(displayTitle(node)); setQuery('>'); setRiser(null); }} />

      {toast && (
        <div className="ff-toast" key={toast.id}>
          <span>{toast.msg}</span>
          <span className="ff-sp" />
          {toast.undo && <button type="button" onClick={() => { setToast(null); toast.undo(); }}>↺ 取り消す</button>}
          <i className="ff-drain" style={{ animationDuration: `${toast.ms}ms` }} />
        </div>
      )}

      <div className="ff-dock">
        <div className="ff-hint">
          <span><b>#</b> 束ねる</span>
          <span><b>&gt;</b> 頼む</span>
          <span><b>?</b> 使い方</span>
          <span className="ff-sp" />
          <button type="button" className="ff-gear" onClick={openSettings}><span>画面のかたち</span></button>
          <span className="ff-state">{st.word}</span>
        </div>
        <div className="ff-inputrow">
          <button type="button" className={`ff-back${backLive ? ' live' : ''}`} onClick={goBack} aria-label="1つ前に戻る">◀</button>
          <span className="ff-caret" aria-hidden="true">{st.caret}</span>
          <input
            ref={fieldRef} className="ff-field" type="text" value={raw} onChange={onChange}
            onKeyDown={onKeyDown}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={() => { composing.current = false; }}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
            placeholder={inMemo ? PLACEHOLDER.memo : PLACEHOLDER.default}
            aria-label={inMemo ? '思い出したことを一言' : '打てば探す'}
          />
          {(raw || inMemo) && <button type="button" className="ff-clear" onClick={clear} aria-label="消す">✕</button>}
        </div>
      </div>

      {intro && <Intro onClose={() => {
        setIntro(false);
        try { localStorage.setItem(KEY_INTRO, '1'); } catch { /* noop */ }
      }} />}
    </div>
  );
}

/* ==========================================================
   積み木（すべて「欄に近い順」の配列から reverse して描かれる）
   ========================================================== */
function StackItem({ x, sel, recall }) {
  switch (x.k) {
    case 'rule':
      return (
        <div className="ff-rule">
          <span>{x.left}</span><span className="ff-ln" />{x.right ? <span>{x.right}</span> : null}
        </div>
      );
    case 'row':
      return (
        <button type="button" className={`ff-row${x.cls ? ` ${x.cls}` : ''}${sel ? ' sel' : ''}`} onClick={x.act}>
          {x.label != null && <span className="ff-tag">{x.label}</span>}
          <span className="ff-rowbody">
            <span className="ff-ttl">
              {x.toks?.length
                ? marks(x.title, x.toks).map((m, i) => (m.hit
                  ? <mark key={`${i}-${m.s}`}>{m.s}</mark> : <span key={`${i}-${m.s}`}>{m.s}</span>))
                : x.title}
            </span>
            {x.sub ? <span className="ff-sub">{x.sub}</span> : null}
          </span>
        </button>
      );
    case 'bar':
      return (
        <button type="button" className={`ff-bar${sel ? ' sel' : ''}`} onClick={x.act} disabled={!x.act}>
          <span className="ff-bl">{x.label}</span>
          <span className="ff-bb"><i style={{ width: `${Math.max(2, (x.n / x.max) * 100)}%` }} className={x.dim ? 'dim' : ''} /></span>
          <span className="ff-bn">{x.n}</span>
        </button>
      );
    case 'block':
      return (
        <button type="button" className={`ff-block${sel ? ' sel' : ''}`} onClick={x.act}>
          <span className="ff-bh">{x.head}</span>
          <span className="ff-bt">{x.title}</span>
          {x.body ? <span className="ff-bx">{x.body}</span> : null}
          {x.extra}
        </button>
      );
    case 'chips':
      return (
        <div className="ff-blk">
          <div className="ff-bh">{x.head}</div>
          <div className="ff-chips">
            {x.items.map((b) => (
              <button type="button" key={b.label} className="ff-chip" onClick={b.act}>{b.label}</button>
            ))}
          </div>
        </div>
      );
    case 'recent':
      return (
        <div className="ff-blk">
          <div className="ff-bh">ゆうべの続き</div>
          {x.items.map((s) => (
            <button type="button" key={s.route} className="ff-recent" onClick={() => x.api.open(s.route)}>{s.title}</button>
          ))}
        </div>
      );
    case 'templates':
      return (
        <div className="ff-blk">
          <div className="ff-bh">こういう頼み方ができる</div>
          {[...TEMPLATES].reverse().map((t) => (
            <div className="ff-tmpl" key={t.t}>＞ 〈…〉{t.t}　— {t.d}</div>
          ))}
        </div>
      );
    case 'note':
      return <div className="ff-notetext">{x.text}</div>;
    case 'pre':
      return <div className="ff-pre">{x.text}</div>;
    case 'slip':
      return (
        <div className="ff-slip">
          <span className="ff-slip-t">{x.slip.line}</span>
          <button type="button" className="ff-slip-x" onClick={() => x.api.dropSlip(x.slip.id)} aria-label="消す">✕</button>
        </div>
      );
    case 'slipacts':
      return (
        <div className="ff-acts">
          <button type="button" className="pri"
            onClick={() => x.api.copy(slipsPrompt(x.slips, x.pending), `${x.slips.length + (x.pending.length ? 1 : 0)}件ぶんをコピーした`)}>
            ぜんぶコピー
          </button>
          <button type="button" onClick={x.api.emptySlips}>渡し終わった</button>
        </div>
      );
    case 'askacts':
      return (
        <div className="ff-acts">
          <button type="button" className="pri" onClick={() => x.api.addAsk(x.text)}>伝票にためる</button>
          <button type="button" onClick={() => x.api.copy(x.text, '依頼をコピーした')}>コピー</button>
        </div>
      );
    case 'help':
      return (
        <div className="ff-help">
          {HELP_ROWS.map(([k, v]) => (
            <div className="ff-help-row" key={k}><span className="ff-help-k">{k}</span><span>{v}</span></div>
          ))}
          <p className="ff-help-p">
            並びの法則はひとつ。欄に近いものほど強く、上へ遡るほど弱い。
            ソフトキーボードに隠れる場所には何も置かない。
          </p>
        </div>
      );
    case 'helpacts':
      return (
        <div className="ff-acts">
          <button type="button" onClick={x.api.reopenIntro}>この面の核をもう一度</button>
        </div>
      );
    case 'recall':
      return <RecallCard {...recall} />;
    default:
      return null;
  }
}

/* ==========================================================
   想起カード —— モード切替なしで空欄の面に流れてくる
   ========================================================== */
function RecallCard({
  current, todaysThree, doneToday, last, memo, flipped, week,
  onFlip, onSkip, onJudge, onUndo, onMore, onOpen,
}) {
  const dots = (
    <span className="ff-dots">
      {todaysThree.map((slug) => <i key={slug} className={doneToday.includes(slug) ? 'on' : ''} />)}
    </span>
  );
  const undoStrip = last ? (
    <div className="ff-undo">
      <span>直前: {last.label}</span>
      <span className="ff-sp" />
      <button type="button" onClick={onUndo}>↺ 取り消す</button>
    </div>
  ) : null;

  if (!current) {
    return (
      <div className="ff-card">
        <div className="ff-ch"><span>おもいだす</span><span className="ff-sp" />{dots}</div>
        {undoStrip}
        <div className="ff-q">きょうの分はかたづいた。今週 {week}件。</div>
        <div className="ff-cacts"><button type="button" className="p" onClick={onMore}>もう一枚ひく</button></div>
      </div>
    );
  }

  return (
    <div className="ff-card">
      <div className="ff-ch"><span>おもいだす</span><span className="ff-sp" />{dots}</div>
      {undoStrip}
      <div className="ff-q">{current.recall || `${current.created} に書いた記事。これ、何の話だったか？`}</div>
      {flipped ? (
        <>
          <div className="ff-a">
            <div className="ff-at">{current.title}</div>
            <div className="ff-ax"><Md text={plain(current.body, 260)} /></div>
          </div>
          {/* 一言は「下の欄」に書く。欄を増やさずに、書いた／書かないで q を 5/4 に分ける */}
          <div className={`ff-memo${memo.trim() ? ' wrote' : ''}`}>
            {memo.trim()
              ? <>… 一言を書いた。<b>わかった</b> なら深く効く扱いになる</>
              : <>… いま下の欄は「一言」の欄。書かずに判定してもよい</>}
          </div>
          <div className="ff-cacts">
            <button type="button" className="g" onClick={() => onJudge(true)}>わかった</button>
            <button type="button" className="w" onClick={() => onJudge(false)}>あやしい</button>
            <button type="button" onClick={onOpen}>ぜんぶ読む</button>
          </div>
        </>
      ) : (
        <div className="ff-cacts">
          <button type="button" className="p" onClick={onFlip}>めくる</button>
          <button type="button" onClick={onSkip}>あとで</button>
        </div>
      )}
    </div>
  );
}

/* ==========================================================
   詳細（読む面）
   ========================================================== */
function Detail({ node, idx, graph, api, today, onAsk }) {
  const outs = useMemo(() => outbound(node, idx, graph.byRoute), [node, idx, graph]);

  // 本文中の [[リンク]] は Md が <a href="#/route"> にする。遷移させず、欄の真上に覗き窓を生やす。
  const onBodyClick = (e) => {
    const a = e.target.closest?.('a[href^="#/"]');
    if (!a) return;
    e.preventDefault();
    api.peek(a.getAttribute('href').slice(1), null);
  };

  return (
    <div className="ff-art" onClick={onBodyClick} role="presentation">
      <h1>{displayTitle(node)}</h1>
      <div className="ff-meta"><span className="fd-chip">{nodeLabel(node)}</span></div>
      <div className="ff-bd">
        <DetailBody node={node} onPeek={api.peek} today={today} />
      </div>

      {outs.length > 0 && (
        <div className="ff-outs">
          <div className="ff-oh">ここから出ていく道</div>
          {outs.slice(0, 14).map((o) => {
            const t = graph.byRoute.get(o.route);
            return (
              <button type="button" className="ff-out" key={o.route} onClick={() => api.peek(o.route, o.reason)}>
                <span className="ff-ot">{t.type === 'note' ? '' : `[${nodeLabel(t)}] `}{displayTitle(t)}</span>
                {o.reason ? <span className="ff-or">{o.reason}</span> : null}
              </button>
            );
          })}
        </div>
      )}

      <div className="ff-acts ff-artacts">
        <button type="button" onClick={onAsk}>この面のことで頼む</button>
      </div>
    </div>
  );
}

/* ==========================================================
   riser —— 覗き窓と「ここへ来る道」。例外なく欄の真上から生える
   ========================================================== */
function Riser({ riser, node, graph, api, onClose, onPaths, onAskPath }) {
  if (riser?.mode === 'peek') {
    const it = graph.byRoute.get(riser.route);
    if (!it) return null;
    return (
      <div className="ff-riser">
        <div className="ff-rhead">
          <span>のぞく</span><span className="ff-sp" />
          <button type="button" onClick={onClose}>閉じる ✕</button>
        </div>
        <div className="ff-rbody">
          <div className="ff-peek">
            <div className="ff-pt">{it.type === 'note' ? '' : `[${nodeLabel(it)}] `}{displayTitle(it)}</div>
            {riser.reason ? <div className="ff-pr">{riser.reason}</div> : null}
            <div className="ff-px">{plain(it.type === 'concept' ? (it.ref.gist || it.body) : it.body, 200)}</div>
            <div className="ff-pa">
              <button type="button" className="pri" onClick={() => { onClose(); api.open(riser.route); }}>ここへ移る</button>
              <button type="button" onClick={onClose}>やめる</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!node) return null;
  const back = graph.backlinks.get(node.route) || [];

  if (riser?.mode === 'paths' && back.length) {
    return (
      <div className="ff-riser">
        <div className="ff-rhead">
          <span>ここへ来る道 {back.length}</span><span className="ff-sp" />
          <button type="button" onClick={onClose}>閉じる ▼</button>
        </div>
        <div className="ff-rbody">
          {back.map((b) => (
            <button type="button" className="ff-out wide" key={b.route} onClick={() => { onClose(); api.open(b.route); }}>
              <span className="ff-ot">
                {b.type === 'note' ? '' : `[${nodeLabel({ type: b.type })}] `}
                {displayTitle(graph.byRoute.get(b.route) || { title: b.title, short: b.title })}
              </span>
              <span className="ff-or">
                {b.reason ? `「${b.reason}」と書いてこちらを指している` : 'こちらを指している'}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 詳細面では畳んだ取っ手を常設する＝行き止まりを作らない
  return (
    <div className="ff-riser collapsed">
      {back.length ? (
        <button type="button" className="ff-rhead as-button" onClick={onPaths}>
          <span>ここへ来る道 {back.length}</span><span className="ff-sp" /><span>▲ ひらく</span>
        </button>
      ) : (
        <div className="ff-rhead">
          <span>ここへ来る道はまだ無い</span><span className="ff-sp" />
          <button type="button" className="amber" onClick={onAskPath}>道をつくるよう頼む</button>
        </div>
      )}
    </div>
  );
}

/* ==========================================================
   最初の1枚 —— この面の唯一にして最大の賭け（上へ積む）を先に伝える
   ========================================================== */
function Intro({ onClose }) {
  return (
    <div className="ff-intro">
      <div className="ff-introbox">
        <h2>一本の欄</h2>
        <p>この面には<b>タブも、ページ遷移も、戻るの階層もありません</b>。あるのは一枚の面と、下端に常駐する一本の欄だけです。</p>
        <p>面の中身は<b>欄に何が入っているかだけで決まります</b>。空なら今日差し出されるもの、打てば全部を横断して絞り込み、<span className="kb">#</span> なら在庫の偏りを束ね、<span className="kb">&gt;</span> なら依頼になる。<b>欄を消せば必ず元の面に戻ります</b>。</p>
        <p><b>並びの法則はひとつ。「欄に近いものほど強い」。</b>結果も今日の紙面も、欄の真上から上へ積まれます。上へ遡るほど弱く・古い。</p>
        <p>そして——<b>打って何も見つからなければ、そのまま Claude への依頼になります</b>。無かったこと自体が、次の蓄積の入口です。</p>
        <div className="ff-fig">
          <div className="ff-figside">↑ 遡るほど<br />弱い・古い</div>
          <div className="ff-figcol">
            <div className="ff-figrow d3">たな</div>
            <div className="ff-figrow d2">連載のつづき</div>
            <div className="ff-figrow d2">定点のうごき</div>
            <div className="ff-figrow d1">きょうの一本</div>
            <div className="ff-figrow d0">おもいだすカード</div>
            <div className="ff-figfield">◀　›　打てば探す　　✕</div>
            <div className="ff-figkb">ソフトキーボード</div>
          </div>
          <div className="ff-figside r">近いほど<br />強い</div>
        </div>
        <button type="button" onClick={onClose}>触ってみる</button>
      </div>
    </div>
  );
}
