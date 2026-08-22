// 面「親指ひとつ」。
//
// 主張はひとつ——**操作の場所を探すコストを消す**。画面の上7割から操作要素を1つ残らず追い出し、
// 操作を下の一点＝原点に集約する。方向の意味は画面をまたいで固定で、原点から一歩も動かずに
// 今日の再読を何枚もさばける（原点が2つに割れて左右で判定する）。
//
// この面の最大の弱点は「低頻度利用では方向の記憶が育たない」こと（docs/.../a-rationale.md）。
// だから**忘れても使える経路**を必ず併設する: 常設の凡例／それ自体がボタン／押しっぱなしで
// 扇が可視表示／指を離しても数秒ラッチ。隠しジェスチャだけの機能はゼロにする。ここは削らない。
//
// 状態は面のルートに閉じ、共有の localStorage（想起・伝票・読了）には lib 越しにしか触らない。
// 面固有の設定だけ `mn.face.thumb.*` に置く（想起や伝票に面ごとの枝を生やさない）。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShell } from '../../shell/ctx.js';
import { useData } from '../../lib/ctx.js';
import { recallQueue } from '../../lib/edition.js';
import { shortTitle } from '../../lib/graph.js';
import {
  addSlip, doneThisWeek, loadPending, loadSeen, loadSlips,
  markSeen, recallLog, recordVerdict, removeSlip, slipsPrompt, todayISO, undoVerdict,
} from '../../lib/recall.js';
import { copyText } from '../../shared/util.js';
import { BACK_DIR, DIRS, extraBacklinks, isJump, itemKey, tagJa } from './model.js';
import { nodeScene, primaryOf, reelItems, sceneKey } from './scene.js';
import { Origin } from './origin.jsx';
import { Rail } from './rail.jsx';
import { Reel } from './reel.jsx';
import { View } from './views.jsx';
import { Intro, Peek, Sheet, Toast } from './parts.jsx';
import './thumb.css';

const KEY_SEEN_INTRO = 'mn.face.thumb.intro';
const KEY_PICK = 'mn.face.thumb.pick';
const UNDO_MS = 8000;   // 判定を書き込むまでの猶予＝取り消せる時間
const NEXT_MS = 340;
const PEEK_MS = 2800;   // 候補を切り替えてから覗き窓が引っ込むまで

const lsGet = (k, fb) => { try { return localStorage.getItem(k) ?? fb; } catch { return fb; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* noop */ } };

export default function ThumbRoot({ initialTarget }) {
  const { openSettings } = useShell();
  const { site, idx, graph, shadow, reads } = useData();
  const today = todayISO();

  // ---- 面の状態 ----
  const [intro, setIntro] = useState(() => lsGet(KEY_SEEN_INTRO, '') !== '1');
  const [face, setFace] = useState('today');
  const [stack, setStack] = useState([]);
  const [reelIdx, setReelIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [queryRaw, setQueryRaw] = useState('');
  const [query, setQuery] = useState('');
  const [dayLimit, setDayLimit] = useState(5);
  const [toast, setToast] = useState('');
  const [sheet, setSheet] = useState(null);
  const [slipV, setSlipV] = useState(0);
  const [undo, setUndo] = useState(null);
  const [peek, setPeek] = useState(false);
  const [pick, setPick] = useState(() => lsGet(KEY_PICK, '') === '1');

  const viewRef = useRef(null);
  const originRef = useRef(null);
  const composing = useRef(false);
  const idxMem = useRef({});
  const toastT = useRef(0);
  const peekT = useRef(0);
  const lastKey = useRef('');
  const selfScroll = useRef(0);   // こちらが送った本文スクロールを、読み手の操作と取り違えない
  const fromRead = useRef(false); // 選択が「本文を読んだ側」から来たか
  const keepPick = useRef('');    // 絞りを切り替えても同じものを選んだままにする
  const commitT = useRef(0);
  const held = useRef(null); // まだ書き込んでいない判定

  // 判定は「判定前の状態」から毎回計算し直す。そうしておくと取り消し・やり直しで間隔が
  // 二重に伸びない。マウント時の影SRS を基準として固定する。
  const baseShadow = useRef(shadow).current;

  const extra = useMemo(() => extraBacklinks(site, graph), [site, graph]);
  const cards = useMemo(
    () => recallQueue(site, graph, baseShadow, today, dayLimit),
    [site, graph, baseShadow, today, dayLimit],
  );

  // 今日ぶんの判定は共有の再読ログから復元する（面ごとの控えは持たない）
  const [judged, setJudged] = useState(() => {
    const m = {};
    for (const r of recallLog()) if (r.date === today) m[r.slug] = r.q >= 3 ? 'ok' : 'fz';
    return m;
  });
  const weekBase = useRef(doneThisWeek() - recallLog().filter((r) => r.date === today).length).current;
  const week = weekBase + Object.keys(judged).length;

  const slips = useMemo(() => loadSlips(), [slipV]); // eslint-disable-line react-hooks/exhaustive-deps
  const pending = useMemo(() => loadPending(), [slipV]); // eslint-disable-line react-hooks/exhaustive-deps
  const seen = useMemo(() => loadSeen(), [slipV]); // eslint-disable-line react-hooks/exhaustive-deps

  const scene = stack.length ? stack[stack.length - 1] : { t: face };
  const key = sceneKey(scene);

  const ctx = useMemo(() => ({
    site, idx, graph, extra, reads, cards, judged, flipped, query, slips, pending, seen,
    today, docketText: slipsPrompt(slips, pending),
  }), [site, idx, graph, extra, reads, cards, judged, flipped, query, slips, pending, seen, today]);

  const allItems = useMemo(() => reelItems(scene, ctx), [key, ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  // 飛び先だけモード。**絞った結果が空になる場面（依頼など）では素通しにする**——
  // 「絞ったら何も無くなった」は、読み手から見れば壊れているのと区別が付かない。
  const jumps = useMemo(() => allItems.filter(isJump), [allItems]);
  const picked = pick && jumps.length > 0 && jumps.length < allItems.length;
  const items = picked ? jumps : allItems;
  const index = Math.max(0, Math.min(reelIdx, items.length - 1));
  const item = items[index];
  const primary = primaryOf(scene, item, ctx);

  // 覗き窓は「候補を切り替えた瞬間」だけ出す。手が止まれば引っ込み、読む領域を返す。
  const showPeek = useCallback(() => {
    setPeek(true);
    clearTimeout(peekT.current);
    peekT.current = setTimeout(() => setPeek(false), PEEK_MS);
  }, []);
  useEffect(() => () => clearTimeout(peekT.current), []);

  const say = useCallback((m) => {
    setToast(m);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 2200);
  }, []);

  // ---- 場面の移動 ----
  const goto = useCallback((next, wantIdx) => {
    idxMem.current[key] = index;
    setStack(next.stack);
    if (next.face) setFace(next.face);
    setFlipped(false);
    const nk = sceneKey(next.stack.length ? next.stack[next.stack.length - 1] : { t: next.face || face });
    setReelIdx(wantIdx ?? idxMem.current[nk] ?? 0);
    setPeek(false);
    clearTimeout(peekT.current);
    selfScroll.current = Date.now();
    if (viewRef.current) viewRef.current.scrollTop = 0;
  }, [key, index, face]);

  const push = useCallback((s) => goto({ stack: [...stack, s] }, 0), [goto, stack]);
  const pop = useCallback(() => {
    if (stack.length) goto({ stack: stack.slice(0, -1) });
    else if (face !== 'today') goto({ stack: [], face: 'today' });
    else say('ここが最初の画面です。移動はメニューから');
  }, [stack, face, goto, say]);
  const goFace = useCallback((f) => {
    if (f !== 'search') { setQuery(''); setQueryRaw(''); }
    goto({ stack: [], face: f }, f === 'today' ? undefined : 0);
    if (f === 'search') setTimeout(() => document.getElementById('tb-find')?.focus(), 60);
  }, [goto]);

  // ---- 判定（この面の主役） ----
  const commit = useCallback(() => {
    const h = held.current;
    held.current = null;
    clearTimeout(commitT.current);
    setUndo(null);
    if (h) recordVerdict(h.note, h.v === 'ok', false, baseShadow);
  }, [baseShadow]);

  const nextCard = useCallback(() => {
    const cur = index;
    setFlipped(false); // 次の1枚は必ず伏せた状態から始める
    for (let j = cur + 1; j < items.length; j += 1) {
      if (!items[j].card || !judged[items[j].card]) { setReelIdx(j); return; }
    }
    setReelIdx(Math.min(cur + 1, items.length - 1));
  }, [index, items, judged]);

  const judge = useCallback((v) => {
    const slug = item?.card;
    if (!slug) return;
    const note = cards.find((c) => c.note.slug === slug)?.note;
    if (!note) return;
    commit(); // 前の判定が宙に浮いていたら先に確定させる
    const at = index;
    setJudged((j) => ({ ...j, [slug]: v }));
    setFlipped(true);
    held.current = { note, v };
    clearTimeout(commitT.current);
    commitT.current = setTimeout(commit, UNDO_MS);
    setUndo({
      label: '元に戻す',
      run: () => {
        held.current = null;
        clearTimeout(commitT.current);
        setUndo(null);
        setJudged((j) => { const n = { ...j }; delete n[slug]; return n; });
        setFlipped(true);
        setReelIdx(at);
      },
    });
    setTimeout(nextCard, NEXT_MS);
  }, [item, cards, index, commit, nextCard]);

  // 猶予が切れて書き込まれたあとの取り消し。判定は取り消せないままにしない（受け入れ条件9）。
  // 巻き戻しは lib の undoVerdict に任せる——影SRS・伝票・履歴の3つを同時に動かすのは
  // recordVerdict なので、その逆操作を面ごとに自作すると必ずどれか1つを取りこぼす。
  const unjudge = useCallback((slug) => {
    if (held.current?.note.slug === slug) {
      held.current = null;
      clearTimeout(commitT.current);
    } else {
      undoVerdict(slug, baseShadow[slug]);
    }
    setUndo(null);
    setJudged((j) => { const n = { ...j }; delete n[slug]; return n; });
    setFlipped(true);
    setSlipV((n) => n + 1);
  }, [baseShadow]);

  // 画面を離れる前に、宙に浮いた判定を必ず書き込む
  useEffect(() => {
    const flush = () => commit();
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [commit]);

  // ---- 原点を叩いたときに起きること（実行は1箇所に集める） ----
  const runAct = useCallback((act) => {
    if (!act) { say('ここでは押せる操作がありません。メニューから移動できます'); return; }
    switch (act.t) {
      case 'go': push(act.s); break;
      case 'flip': setFlipped(true); break;
      case 'next': nextCard(); break;
      case 'more': setDayLimit((n) => n + 5); say('次の5枚を追加しました'); break;
      case 'write': setSheet(''); break;
      case 'ask': setSheet(act.text); break;
      case 'copy':
        copyText(slipsPrompt(loadSlips(), loadPending()))
          .then(() => say('コピーしました。Claude に貼り付けてください'));
        break;
      case 'del': {
        const gone = slips.find((s) => s.id === act.id);
        removeSlip(act.id);
        setSlipV((n) => n + 1);
        setUndo({
          label: '元に戻す',
          run: () => { if (gone) addSlip(gone); setSlipV((n) => n + 1); setUndo(null); },
        });
        clearTimeout(commitT.current);
        commitT.current = setTimeout(() => setUndo(null), UNDO_MS);
        break;
      }
      default: break;
    }
  }, [push, nextCard, say, slips]);

  const onDir = useCallback((id) => {
    if (id === '__back') pop();
    else goFace(id);
  }, [pop, goFace]);

  // 候補を切り替えたら、**本文側の該当行を見えるところまで送る**。
  // 帯で選んでいるものと、上に映っているものが一致していないと、
  // 「タップで開く」が何を開くのか読者の側から確かめられない。
  // 場面に入った直後は動かさない——記事は先頭から読ませたいので、そこを奪わない。
  useEffect(() => {
    const v = viewRef.current;
    const first = lastKey.current !== key;
    lastKey.current = key;
    if (!v || first) return;
    if (fromRead.current) { fromRead.current = false; return; } // 読んだ側から動いたぶんは送り返さない
    const el = v.querySelector('.is-on');
    if (!el) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const top = el.getBoundingClientRect().top - v.getBoundingClientRect().top + v.scrollTop;
    const h = el.offsetHeight;
    const guard = 168;                       // 覗き窓が出ても隠れない位置に置く
    const lo = v.scrollTop + 12;
    const hi = v.scrollTop + v.clientHeight - guard;
    let to = null;
    if (top < lo) to = top - 12;
    else if (top + h > hi) to = top + h + guard - v.clientHeight;
    if (to != null) {
      selfScroll.current = Date.now();
      v.scrollTo({ top: Math.max(0, to), behavior: smooth ? 'smooth' : 'auto' });
    }
  }, [index, key]);

  // 2) 逆向き（本文→帯）: 読んでいる位置にいちばん近い行へ、帯の選択を寄せる。
  // これで「読んでいたものをそのまま開く」が成立する——本文の一覧を読んで飛びたくなったとき、
  // 同じ項目を帯の中から探し直す必要がなくなる。
  // こちらが送ったスクロール（1）では動かさない。往復すると選択が発振する。
  useEffect(() => {
    const v = viewRef.current;
    if (!v) return undefined;
    let raf = 0;
    const onScroll = () => {
      if (Date.now() - selfScroll.current < 500 || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rows = v.querySelectorAll('[data-pick]');
        if (!rows.length) return;
        const line = v.getBoundingClientRect().top + 28; // 「いま読んでいる高さ」
        let best = null;
        let bestD = Infinity;
        for (const el of rows) {
          const r = el.getBoundingClientRect();
          if (r.bottom < line) continue;               // 読み終えた行は候補にしない
          const d = Math.abs(r.top - line);
          if (d < bestD) { bestD = d; best = el; }
        }
        if (!best) return;
        const i = items.findIndex((it) => itemKey(it) === best.dataset.pick);
        if (i < 0 || i === index) return;
        fromRead.current = true;
        setReelIdx(i);
        setFlipped(false);
      });
    };
    v.addEventListener('scroll', onScroll, { passive: true });
    return () => { v.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [items, index]);

  // 絞りを切り替えても、いま選んでいるものは選んだままにする（並びの番号は変わるため）
  useEffect(() => {
    if (!keepPick.current) return;
    const want = keepPick.current;
    keepPick.current = '';
    const i = items.findIndex((it) => itemKey(it) === want);
    if (i >= 0) setReelIdx(i);
  }, [items]);

  // 起動直後は、今日の未判定の最初の1枚に合わせる（続きから差し出す）
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || face !== 'today' || stack.length || !items.length) return;
    seeded.current = true;
    const i = items.findIndex((x) => x.card && !judged[x.card]);
    if (i > 0) setReelIdx(i);
  }, [items, judged, face, stack.length]);

  // ---- ディープリンク ----
  useEffect(() => {
    if (!initialTarget?.route) return;
    setStack([nodeScene(initialTarget.route)]);
    setReelIdx(0);
    setSheet(null); // 外から飛んできたら、書きかけの依頼で画面を塞がない
  }, [initialTarget?.route]); // eslint-disable-line react-hooks/exhaustive-deps

  // 開いたものは共有の「最近見たもの」に記録する（面をまたいで1つ）
  useEffect(() => {
    if (scene.t !== 'node') return;
    const n = graph.byRoute.get(scene.route);
    if (n) markSeen(n.route, shortTitle(n.title));
  }, [scene.t, scene.route, graph]);

  // ---- キーボード（PC でも完走できるように） ----
  useEffect(() => {
    const onKey = (e) => {
      if (intro) { if (e.key === 'Enter') { setIntro(false); lsSet(KEY_SEEN_INTRO, '1'); } return; }
      const t = e.target;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') { t.blur(); setSheet(null); }
        return;
      }
      if (t?.closest?.('button') && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowLeft')) return;
      if (e.key === 'ArrowRight') { setReelIdx((i) => Math.min(i + 1, items.length - 1)); showPeek(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { setReelIdx((i) => Math.max(i - 1, 0)); showPeek(); e.preventDefault(); }
      else if (e.key === 'Home') { setReelIdx(0); showPeek(); e.preventDefault(); }
      else if (e.key === 'End') { setReelIdx(items.length - 1); showPeek(); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { runAct(primary.act); e.preventDefault(); }
      else if (e.key === 'Escape' || e.key === 'Backspace') { pop(); e.preventDefault(); }
      else if (e.key >= '1' && e.key <= '4') goFace(DIRS[Number(e.key) - 1].id);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [intro, items.length, primary, runAct, pop, goFace, showPeek]);

  // ---- 表示用の文字列 ----
  const faceLabel = DIRS.find((d) => d.id === face)?.label || '今日';
  const crumbs = stack.map((s) => {
    if (s.t === 'theme') return tagJa(s.tag);
    const n = graph.byRoute.get(s.route);
    return n ? shortTitle(n.title).slice(0, 14) : '…';
  });
  const selName = item ? `${item.k}：${item.l}` : '選択なし';
  const card = item?.card ? cards.find((c) => c.note.slug === item.card)?.note : null;
  const lobeLabels = {
    fz: `あやしい（答え：${card?.title || ''}）。近いうちにまた表示します`,
    ok: `わかった（答え：${card?.title || ''}）。次に表示するまでの間隔が延びます`,
  };

  const nested = stack.length > 0;
  // いま選んでいるのが「判定ずみの札」なら、いつでも判定を戻せる
  const judgedCard = item?.card && judged[item.card] ? item.card : null;

  return (
    <div className="face-thumb" data-face="thumb">
      {/* 上7割 = 読むためだけの場所。押せるものを1つも置かない */}
      <div id="tb-view" className="tb-view" ref={viewRef} role="region" aria-label="本文" tabIndex={0}>
        <div className={`tb-viewin${scene.t === 'today' && item?.card ? ' is-fill' : ''}`}>
          <View scene={scene} ctx={ctx} item={item} items={items} />
        </div>
      </div>

      {scene.t !== 'today' && <Peek item={item} ctx={ctx} on={peek} />}

      {/* 下3割 = 操作するところ */}
      <div className="tb-ops" role="group" aria-label="操作パネル">
        <div className="tb-opsin">
          <Reel
            items={items}
            index={index}
            resetKey={`${key}:${picked ? 'p' : 'a'}`}
            onIndex={(i) => { setReelIdx(i); setFlipped(false); showPeek(); }}
            onActivate={() => runAct(primary.act)}
            empty={scene.t === 'search' ? 'キーワードを入力すると候補が表示されます' : '候補はありません。メニューから別の画面へ移動できます'}
          />

          <div className="tb-panel">
            {scene.t === 'search' ? (
              <div className="tb-find">
                <label className="tb-sr" htmlFor="tb-find">キーワードで検索</label>
                <input
                  id="tb-find" type="search" autoComplete="off" enterKeyHint="search"
                  placeholder="キーワードを入力（例：毛穴、メッシ）"
                  value={queryRaw}
                  onChange={(e) => { setQueryRaw(e.target.value); if (!composing.current) { setQuery(e.target.value); setReelIdx(0); } }}
                  onCompositionStart={() => { composing.current = true; }}
                  onCompositionEnd={(e) => { composing.current = false; setQuery(e.target.value); setReelIdx(0); }}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); runAct(primary.act); }
                  }}
                />
              </div>
            ) : (
              <>
                <div className="tb-where">
                  {/* 現在地は詰まったら省略してよいが、絞りが効いている印だけは必ず残す
                      ——見えないと「候補が減っている」がただの不具合に見える */}
                  <span className="tb-wherein">
                    <b>{faceLabel}</b>
                    {crumbs.map((c) => <span key={c}> › {c}</span>)}
                  </span>
                  {picked && <span className="tb-pickon">飛び先だけ</span>}
                </div>
                <div className="tb-act">
                  {primary.split ? <em>答え合わせ</em>
                    : primary.act ? <>タップで <em>{primary.label}</em></>
                      : <>スワイプで <em>移動</em></>}
                </div>
              </>
            )}

            {/* 凡例は常設のヒントであり、そのままボタンでもある＝方向を忘れても目で選べる経路 */}
            <button
              type="button" className="tb-legend" aria-haspopup="menu"
              aria-label={`メニューを開く：${DIRS.map((d) => d.label).join("・")}・${BACK_DIR.label}。ボタンから同じ方向へスワイプしても移動できます`}
              onClick={() => originRef.current?.toggleFan()}
            >
              {DIRS.map((d) => (
                <span key={d.id} className={face === d.id && !nested ? 'is-cur' : ''} aria-hidden="true">
                  <b>{d.arrow}</b>{d.label}
                </span>
              ))}
              <span aria-hidden="true"><b>{BACK_DIR.arrow}</b>{BACK_DIR.label}</span>
            </button>

            <div className="tb-foot">
              {!undo && judgedCard ? (
                // 猶予が切れたあとの逃げ道。ここが無いと判定が取り消せない操作になる
                <button type="button" className="tb-undo" onClick={() => unjudge(judgedCard)}>↺ 元に戻す</button>
              ) : (
                // 道具と幅を取り合う。詰まったら先に削るのはカウンタから（道具は残す）
                <span className="tb-counter" role="status">
                  {!undo && !primary.split && week ? `今週の再読 ${week}枚` : ''}
                </span>
              )}
              <span className="tb-spacer" />
              <div className="tb-tools">
                {nested && (
                  <button type="button" aria-label="戻る（下にスワイプしても戻れます）" onClick={pop}>
                    <span aria-hidden="true">↓</span>
                  </button>
                )}
                {/* 今日の面には絞る相手が居ない（札は飛び先ではない）ので出さない。
                    出しても効かない道具を並べると、道具の意味が薄まる */}
                {scene.t !== 'today' && (
                <button
                  type="button"
                  className={pick ? 'is-on' : ''}
                  aria-pressed={pick ? 'true' : 'false'}
                  aria-label="候補を飛び先だけに絞る"
                  onClick={() => {
                    keepPick.current = itemKey(item);
                    setPick((v) => {
                      const n = !v;
                      lsSet(KEY_PICK, n ? '1' : '0');
                      if (n) say(jumps.length ? '飛び先だけに絞った' : 'この画面には飛び先が無いので、そのまま出す');
                      else say('絞りを外した');
                      return n;
                    });
                  }}
                >
                  <span aria-hidden="true">⇢</span>
                </button>
                )}
                <button type="button" aria-label="使い方を見る" onClick={() => setIntro(true)}>
                  <span aria-hidden="true">?</span>
                </button>
                <button type="button" aria-label="設定を開く（画面のかたちを選ぶ）" onClick={openSettings}>
                  <span aria-hidden="true">⚙</span>
                </button>
              </div>
            </div>
          </div>

          {/* つまみ。読む領域を、指を下3割に置いたまま送るための握り */}
          <Rail viewRef={viewRef} resetKey={key} controls="tb-view" />

          <Origin
            ref={originRef}
            split={!!primary.split}
            verb={primary.short}
            label={primary.act ? `${primary.label}（選択中：${selName}）` : `${primary.label}（現在は使用できません）`}
            disabled={!primary.act}
            faceId={face}
            atRoot={!nested}
            lobeLabels={lobeLabels}
            onPrimary={() => runAct(primary.act)}
            onJudge={judge}
            onDir={onDir}
          />
        </div>
      </div>

      {sheet !== null && (
        <Sheet
          prefill={sheet}
          onCancel={() => setSheet(null)}
          onAdd={(text) => {
            if (!text) { say('依頼の内容を入力してください'); return; }
            addSlip({
              id: `thumb:${text.slice(0, 40)}:${Date.now()}`,
              kind: 'ask',
              label: text.slice(0, 40),
              intro: '/mn 以下を頼みたい。内容に応じて適切なルートに振り分けて記録して。',
              line: text,
            });
            setSlipV((n) => n + 1);
            setSheet(null);
            if (face !== 'ask' || nested) goFace('ask');
            say('依頼リストに追加しました');
          }}
        />
      )}

      {intro && (
        <Intro
          onClose={() => { setIntro(false); lsSet(KEY_SEEN_INTRO, '1'); }}
          onSettings={openSettings}
        />
      )}

      {/* 取り消しは操作領域の上に浮かせる。足元の行で道具と幅を取り合うと、
          狭い端末で「↺ 元に戻…」のように切れる（実際に切れていた） */}
      {undo && (
        <div className="tb-undobar">
          <button type="button" className="tb-undo" onClick={() => { undo.run(); }}>↺ {undo.label}</button>
        </div>
      )}

      <Toast text={toast} />
    </div>
  );
}
