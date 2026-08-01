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
  markSeen, recallLog, recordVerdict, removeSlip, slipsPrompt, todayISO,
} from '../../lib/recall.js';
import { copyText } from '../../shared/util.js';
import { DIRS, extraBacklinks, tagJa } from './model.js';
import { nodeScene, primaryOf, reelItems, sceneKey } from './scene.js';
import { Origin } from './origin.jsx';
import { Reel } from './reel.jsx';
import { View } from './views.jsx';
import { Intro, Peek, Sheet, Toast } from './parts.jsx';
import './thumb.css';

const KEY_HAND = 'mn.face.thumb.hand';
const KEY_SEEN_INTRO = 'mn.face.thumb.intro';
const UNDO_MS = 8000;   // 判定を書き込むまでの猶予＝取り消せる時間
const NEXT_MS = 340;

const lsGet = (k, fb) => { try { return localStorage.getItem(k) ?? fb; } catch { return fb; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* noop */ } };

export default function ThumbRoot({ initialTarget }) {
  const { openSettings } = useShell();
  const { site, idx, graph, shadow, reads } = useData();
  const today = todayISO();

  // ---- 面の状態 ----
  const [hand, setHand] = useState(() => (lsGet(KEY_HAND, 'L') === 'R' ? 'R' : 'L'));
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

  const viewRef = useRef(null);
  const originRef = useRef(null);
  const composing = useRef(false);
  const idxMem = useRef({});
  const toastT = useRef(0);
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
    today, hand, docketText: slipsPrompt(slips, pending),
  }), [site, idx, graph, extra, reads, cards, judged, flipped, query, slips, pending, seen, today, hand]);

  const items = useMemo(() => reelItems(scene, ctx), [key, ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  const index = Math.max(0, Math.min(reelIdx, items.length - 1));
  const item = items[index];
  const primary = primaryOf(scene, item, ctx);

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
    if (viewRef.current) viewRef.current.scrollTop = 0;
  }, [key, index, face]);

  const push = useCallback((s) => goto({ stack: [...stack, s] }, 0), [goto, stack]);
  const pop = useCallback(() => {
    if (stack.length) goto({ stack: stack.slice(0, -1) });
    else if (face !== 'today') goto({ stack: [], face: 'today' });
    else say('ここが根。原点を引けば他の3つへ行ける');
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
      label: '取り消す',
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

  // 画面を離れる前に、宙に浮いた判定を必ず書き込む
  useEffect(() => {
    const flush = () => commit();
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [commit]);

  // ---- 原点を叩いたときに起きること（実行は1箇所に集める） ----
  const runAct = useCallback((act) => {
    if (!act) { say('ここでは叩いても何も起きない。原点を引いて行き先を選ぶ'); return; }
    switch (act.t) {
      case 'go': push(act.s); break;
      case 'flip': setFlipped(true); break;
      case 'next': nextCard(); break;
      case 'more': setDayLimit((n) => n + 5); say('今日の並びから、次の5枚を出した'); break;
      case 'write': setSheet(''); break;
      case 'ask': setSheet(act.text); break;
      case 'copy':
        copyText(slipsPrompt(loadSlips(), loadPending()))
          .then(() => say('伝票をコピーした。Mac で Claude に貼る'));
        break;
      case 'del': {
        const gone = slips.find((s) => s.id === act.id);
        removeSlip(act.id);
        setSlipV((n) => n + 1);
        setUndo({
          label: '依頼を戻す',
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
      if (e.key === 'ArrowRight') { setReelIdx((i) => Math.min(i + 1, items.length - 1)); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { setReelIdx((i) => Math.max(i - 1, 0)); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { runAct(primary.act); e.preventDefault(); }
      else if (e.key === 'Escape' || e.key === 'Backspace') { pop(); e.preventDefault(); }
      else if (e.key >= '1' && e.key <= '4') goFace(DIRS[Number(e.key) - 1].id);
      else if (e.key === 'h' || e.key === 'H') setHand((h) => { const n = h === 'L' ? 'R' : 'L'; lsSet(KEY_HAND, n); return n; });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [intro, items.length, primary, runAct, pop, goFace]);

  // ---- 表示用の文字列 ----
  const faceLabel = DIRS.find((d) => d.id === face)?.label || '今日';
  const crumbs = stack.map((s) => {
    if (s.t === 'theme') return tagJa(s.tag);
    const n = graph.byRoute.get(s.route);
    return n ? shortTitle(n.title).slice(0, 14) : '…';
  });
  const selName = item ? `${item.k}：${item.l}` : 'なし';
  const card = item?.card ? cards.find((c) => c.note.slug === item.card)?.note : null;
  const lobeLabels = {
    fz: `あやしい。答えは「${card?.title || ''}」。近いうちにまた出す`,
    ok: `わかった。答えは「${card?.title || ''}」。次に出るまでの間隔を伸ばす`,
  };

  const nested = stack.length > 0;
  const near = primary.split ? 172 : 128;

  return (
    <div className={`face-thumb${hand === 'R' ? ' is-right' : ''}`} data-face="thumb">
      {/* 上7割 = 読むためだけの場所。押せるものを1つも置かない */}
      <div className={`tb-view${scene.t !== 'today' ? ' has-peek' : ''}`} ref={viewRef} role="region" aria-label="読むところ" tabIndex={0}>
        <div className={`tb-viewin${scene.t === 'today' && item?.card ? ' is-fill' : ''}`}>
          <View scene={scene} ctx={ctx} item={item} items={items} />
        </div>
      </div>

      {scene.t !== 'today' && <Peek item={item} ctx={ctx} />}

      {/* 下3割 = 操作するところ */}
      <div className="tb-ops" role="group" aria-label="操作するところ">
        <div className="tb-opsin" style={{ '--near': `${near}px` }}>
          <Reel
            items={items}
            index={index}
            resetKey={key}
            onIndex={(i) => { setReelIdx(i); setFlipped(false); }}
            onActivate={() => runAct(primary.act)}
            empty={scene.t === 'search' ? 'ことばを打つと、ここに候補が並ぶ' : 'ここには候補が無い。原点を引いて別の場所へ。'}
          />

          <div className="tb-panel">
            {scene.t === 'search' ? (
              <div className="tb-find">
                <label className="tb-sr" htmlFor="tb-find">ことばで探す</label>
                <input
                  id="tb-find" type="search" autoComplete="off" enterKeyHint="search"
                  placeholder="ことばを打つ（例: 毛穴 / メッシ）"
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
                  <b>{faceLabel}</b>
                  {crumbs.map((c) => <span key={c}> ▸ {c}</span>)}
                </div>
                <div className="tb-act">
                  {primary.split ? <em>思い出せた？</em>
                    : primary.act ? <>叩く → <em>{primary.label}</em></>
                      : <>引く → <em>行き先を選ぶ</em></>}
                </div>
              </>
            )}

            {/* 凡例は常設のヒントであり、そのままボタンでもある＝方向を忘れても目で選べる経路 */}
            <button
              type="button" className="tb-legend" aria-haspopup="menu"
              aria-label="行き先を選ぶ。今日・見渡す・探す・頼む・戻す。原点から方向へ引いても同じ"
              onClick={() => originRef.current?.toggleFan()}
            >
              {DIRS.map((d) => (
                <span key={d.id} className={face === d.id && !nested ? 'is-cur' : ''} aria-hidden="true">
                  <b>{hand === 'R' ? (d.arrowR || d.arrow) : d.arrow}</b>{d.label}
                </span>
              ))}
              <span aria-hidden="true"><b>↓</b>戻す</span>
            </button>

            <div className="tb-foot">
              {undo ? (
                <button type="button" className="tb-undo" onClick={() => { undo.run(); }}>↺ {undo.label}</button>
              ) : (
                // 判定中は原点が太るぶん幅が無い。削るのはカウンタから（道具は残す）
                <span className="tb-counter" role="status">
                  {!primary.split && week ? `今週 ${week}枚 めくった` : ''}
                </span>
              )}
              <span className="tb-spacer" />
              <div className="tb-tools">
                {nested && (
                  <button type="button" aria-label="1つ前に戻る（原点を下へ引くのと同じ）" onClick={pop}>
                    <span aria-hidden="true">↓</span>
                  </button>
                )}
                <button
                  type="button" aria-label={`原点を${hand === 'L' ? '右下' : '左下'}へ入れ替える`}
                  onClick={() => setHand((h) => {
                    const n = h === 'L' ? 'R' : 'L';
                    lsSet(KEY_HAND, n);
                    say(n === 'L' ? '原点を左下へ' : '原点を右下へ');
                    return n;
                  })}
                >
                  <span aria-hidden="true">⇄</span>
                </button>
                <button type="button" aria-label="この画面の使い方をもう一度読む" onClick={() => setIntro(true)}>
                  <span aria-hidden="true">?</span>
                </button>
                <button type="button" aria-label="設定をひらく（読む面のかたちを選ぶ）" onClick={openSettings}>
                  <span aria-hidden="true">⚙</span>
                </button>
              </div>
            </div>
          </div>

          <Origin
            ref={originRef}
            hand={hand}
            split={!!primary.split}
            verb={primary.short}
            label={primary.act ? `${primary.label}。選んでいるのは ${selName}` : `${primary.label}（いまは押せない）`}
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
            if (!text) { say('何を頼むか、一言でいいから書く'); return; }
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
            say('伝票に足した');
          }}
        />
      )}

      {intro && (
        <Intro
          hand={hand}
          onClose={() => { setIntro(false); lsSet(KEY_SEEN_INTRO, '1'); }}
          onSettings={openSettings}
        />
      )}

      <Toast text={toast} />
    </div>
  );
}
