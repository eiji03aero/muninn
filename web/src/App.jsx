// shell —— 面の外側。どの面が選ばれていても必ず通る層。
//
// 責務は4つだけ:
//   1. 復号してデータをメモリに載せる（DataCtx）
//   2. どの面を出すかを決める（localStorage `mn.face`。未設定・未知の値は日報に落ちる）
//   3. `#/settings` を開く非常口を全面に用意する
//   4. ディープリンク（`#/note/:slug` 等）を面に渡す
//
// 面ごとにナビゲーションの流儀が違う（日報はルータ、面Aは方向、面Bは遷移そのものが無い）ので、
// **共通のルータを全面に強制しない**。shell が握るのは上の2つの URL だけで、
// 画面内の移動は各面の自由にする。
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataCtx } from './lib/ctx.js';
import { ShellCtx } from './shell/ctx.js';
import { loadSite, unlockWithPasskey, unlockWithPassword } from './lib/data.js';
import { buildIndex } from './lib/wiki.js';
import { buildGraph } from './lib/graph.js';
import { loadShadow, loadRead, setLogSource } from './lib/recall.js';
import { faceById, loadFaceId, saveFaceId, touchFace } from './shell/face.js';
import { currentPath, setPath, parseTarget, SETTINGS_PATH } from './shell/hash.js';
import { Settings } from './shell/Settings.jsx';
import { LockGate, ShellLoading, ShellError } from './shell/Gate.jsx';
import './shell/shell.css';

export default function App() {
  const [state, setState] = useState({ status: 'loading', site: null, idx: null, error: '', lock: null });
  const [tick, setTick] = useState(0);
  const [faceId, setFaceId] = useState(loadFaceId);
  // 設定は「面の代わりに出す」。面の上に重ねると、面のルータが `#/settings` を
  // 知らないパスとして自分の入口へ書き戻してしまい、hash の取り合いになる。
  const [inSettings, setInSettings] = useState(() => currentPath() === SETTINGS_PATH);
  // 面が立ち上がる時点で「開くべき対象」。URL を持たない面（親指ひとつ・一本の欄）では、
  // 外から飛んできたディープリンクを受け取る唯一の経路でもある。
  const [target, setTarget] = useState(() => parseTarget(currentPath()));
  const returnPath = useRef('/');

  useEffect(() => {
    loadSite()
      .then((s) => setState({ status: 'ready', site: s, idx: buildIndex(s), error: '', lock: null }))
      .catch((e) => {
        if (e.code === 'LOCKED') setState((p) => ({ ...p, status: 'locked', lock: e.lock }));
        else setState((p) => ({ ...p, status: 'error', error: String(e.message || e) }));
      });
  }, []);

  // 面を跨いで使い回す状態（影SRS・伝票・読了）は面ごとに分けない。分けた瞬間に
  // 「面を変えたら積み上げが消える」が起きる。記録するのは「どの面で読んだか」のラベルだけ。
  useEffect(() => {
    setLogSource(faceId);
    touchFace(faceId);
  }, [faceId]);

  // URL 直打ち・PWA のブックマークから `#/settings` に入ってこられるようにする。
  useEffect(() => {
    const onHash = () => setInSettings(currentPath() === SETTINGS_PATH);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // 面を畳んだ**あと**に hash を書き換える（この effect は commit 後に走るので、
  // このとき面のルータはもう居ない＝書き換えを奪い返されない）。
  useEffect(() => {
    if (inSettings && currentPath() !== SETTINGS_PATH) setPath(SETTINGS_PATH);
  }, [inSettings]);

  // 解錠は2経路（Face ID / パスワード）あるが、成功したあとに起きることは同じ。
  // 失敗メッセージだけを経路ごとに変える——Face ID は「違う」ではなく「取れなかった」が起きるため。
  const unlock = async (run, fallbackMessage, cancelMessage = '') => {
    try {
      const s = await run(state.lock);
      setState((p) => ({ ...p, status: 'ready', site: s, idx: buildIndex(s), error: '' }));
    } catch (e) {
      // ユーザーが自分でシートを閉じたときは失敗として騒がない
      const cancelled = e?.name === 'NotAllowedError' || e?.name === 'AbortError';
      setState((p) => ({
        ...p, status: 'locked', error: cancelled ? cancelMessage : (e?.message || fallbackMessage),
      }));
    }
  };

  const graph = useMemo(
    () => (state.site ? buildGraph(state.site, state.idx) : null),
    [state.site, state.idx],
  );
  // 影SRS と読了は localStorage 由来。判定するたびに読み直す（tick で再計算を促す）。
  const shadow = useMemo(() => (state.site ? loadShadow(state.site) : {}), [state.site, tick]);
  const reads = useMemo(() => {
    const m = {};
    for (const a of state.site?.atlases || []) m[a.slug] = loadRead(a.slug);
    return m;
  }, [state.site, tick]);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const data = useMemo(
    () => ({ site: state.site, idx: state.idx, graph, shadow, reads, refresh }),
    [state.site, state.idx, graph, shadow, reads, refresh],
  );

  const openSettings = useCallback(() => {
    returnPath.current = currentPath();
    setInSettings(true);
  }, []);

  const closeSettings = useCallback((to) => {
    const dest = to || returnPath.current || '/';
    setInSettings(false);
    setPath(dest); // 面が再び立ち上がる前に hash を戻す（面はこの hash を見て始まる）
    setTarget(parseTarget(dest));
  }, []);

  // 選んだら即座に切り替わる（リロード不要）。新しい面は入口から始める——
  // 直前まで見ていたページは前の面の流儀の産物で、次の面に同じ場所があるとは限らない。
  const pickFace = useCallback((id) => {
    const next = faceById(id).id;
    saveFaceId(next);
    setFaceId(next);
    closeSettings('/');
  }, [closeSettings]);

  const face = faceById(faceId);

  // URL を持たない面のときだけ、shell が hash を見張って対象を差し替える。
  // ディープリンクは「別のアプリから飛んでくる」だけでなく、PWA を開いたまま
  // 共有リンクを踏む形でも来る——初回マウントだけ見ていると、その2回目以降を落とす。
  // 逆に日報のように自分で URL を書き換える面でこれをやると、面が動くたびに
  // shell まで巻き込んで再描画してしまうので、面の宣言（ownsUrl）で切り分ける。
  useEffect(() => {
    if (face.ownsUrl) return undefined;
    const onHash = () => {
      const p = currentPath();
      if (p !== SETTINGS_PATH) setTarget(parseTarget(p));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [face.ownsUrl]);

  const initialTarget = inSettings ? null : target;

  const shell = useMemo(
    () => ({ face, openSettings, initialTarget }),
    [face, openSettings, initialTarget],
  );

  if (state.status === 'loading') return <ShellLoading />;
  if (state.status === 'locked') {
    return (
      <LockGate
        lock={state.lock}
        error={state.error}
        // WebAuthn は「中断した」と「この端末に鍵が無い」を区別できない（プライバシー上わざと同じ
        // NotAllowedError にしている）。無言で戻すと壊れて見えるので、両方を含む言い方で伝える。
        onPasskey={() => unlock(
          (l) => unlockWithPasskey(l),
          '鍵を取り出せなかったのだ',
          '開けなかった。中断したか、この端末がまだ登録されていない',
        )}
        onPassword={(pw) => unlock((l) => unlockWithPassword(l, pw), 'パスワードが違うのだ')}
      />
    );
  }
  if (state.status === 'error') return <ShellError message={state.error} />;

  return (
    <DataCtx.Provider value={data}>
      <ShellCtx.Provider value={shell}>
        {inSettings ? (
          <Settings faceId={faceId} onPick={pickFace} onClose={() => closeSettings()} />
        ) : (
          <Suspense fallback={<ShellLoading />}>
            <face.Root key={face.id} initialTarget={initialTarget} />
          </Suspense>
        )}
      </ShellCtx.Provider>
    </DataCtx.Provider>
  );
}
