import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { Heading, Text, Input, Button, VStack } from '@chakra-ui/react';
import { DataCtx } from './lib/ctx.js';
import { loadSite } from './lib/data.js';
import { buildIndex } from './lib/wiki.js';
import { buildGraph, tagToParam } from './lib/graph.js';
import { loadShadow, loadRead } from './lib/recall.js';
import { Note, Follow, Player } from './pages.jsx';
import { Edition } from './edition.jsx';
import { Shelf, ShelfBoard } from './shelf.jsx';
import { Search } from './search.jsx';
import { Desk } from './desk.jsx';
import { Atlas, Concept } from './atlas.jsx';
import { LogTopic, LogEntry } from './logs.jsx';
import { Center, Loading, BottomTabs } from './ui.jsx';
import { C, ACCENT_GRADIENT } from './theme.js';

function PasswordGate({ onSubmit, error }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); await onSubmit(pw); setBusy(false); };
  return (
    <Center>
      <Heading size="xl" color={C.ink} letterSpacing="0.3em">muninn</Heading>
      <Text fontSize="sm" color={C.muted}>パスワードを入れるのだ</Text>
      <VStack gap="3" w="100%" maxW="300px" mt="2">
        <Input type="password" value={pw} placeholder="password"
          onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
          color={C.ink} bg="rgba(255,255,255,.05)" border="1px solid" borderColor={C.line}
          borderRadius="14px" textAlign="center" _placeholder={{ color: C.faint }}
          _focus={{ borderColor: C.sky, outline: 'none' }} />
        <Button w="100%" onClick={submit} loading={busy} color="#08111f" fontWeight="700"
          bg={ACCENT_GRADIENT} borderRadius="14px" _hover={{ opacity: 0.92 }}>開く</Button>
        {error && <Text fontSize="sm" color={C.pink}>{error}</Text>}
      </VStack>
    </Center>
  );
}

// 新ページ遷移(PUSH/REPLACE)は先頭へ、戻る(POP)は直前のスクロール位置を復元する。
function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();
  const positions = useRef(new Map());
  const currentKey = useRef(location.key);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const onScroll = () => positions.current.set(currentKey.current, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    currentKey.current = location.key;
    if (navType === 'POP') {
      const y = positions.current.get(location.key) ?? 0;
      const restore = () => window.scrollTo(0, y);
      requestAnimationFrame(() => { restore(); requestAnimationFrame(restore); });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.key, navType]);

  return null;
}

// 旧ルート（/notes・/moc/:slug・/logs）の着地。PWA のホーム追加やブックマークから
// 旧URLが踏まれるのは実運用で必ず起きる。黙って飛ばさず、何がどこへ行ったかを1回だけ告げる。
function LegacyMoc({ graph }) {
  const { slug } = useParams();
  const bundle = graph.bundles.find((b) => b.moc === slug && b.tag);
  const to = bundle ? `/shelf/${tagToParam(bundle.tag)}` : '/shelf';
  return <Navigate to={to} replace state={{ legacy: 'moc' }} />;
}

export default function App() {
  const [state, setState] = useState({ status: 'loading', site: null, idx: null, error: '' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    loadSite(null)
      .then((s) => setState({ status: 'ready', site: s, idx: buildIndex(s), error: '' }))
      .catch((e) => {
        if (e.code === 'PASSWORD_REQUIRED') setState((p) => ({ ...p, status: 'needpass' }));
        else setState((p) => ({ ...p, status: 'error', error: String(e.message || e) }));
      });
  }, []);

  const submitPass = async (pw) => {
    try {
      const s = await loadSite(pw);
      setState({ status: 'ready', site: s, idx: buildIndex(s), error: '' });
    } catch {
      setState((p) => ({ ...p, status: 'needpass', error: 'パスワードが違うのだ' }));
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

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'needpass') return <PasswordGate onSubmit={submitPass} error={state.error} />;
  if (state.status === 'error') return <Center><Text color={C.muted}>読み込み失敗: {state.error}</Text></Center>;

  return (
    <DataCtx.Provider value={{ site: state.site, idx: state.idx, graph, shadow, reads, refresh }}>
      <HashRouter>
        <ScrollManager />
        <Routes>
          <Route path="/" element={<Edition />} />
          <Route path="/shelf" element={<Shelf />} />
          <Route path="/shelf/:tag" element={<ShelfBoard />} />
          <Route path="/search" element={<Search />} />
          <Route path="/desk" element={<Desk />} />

          <Route path="/note/:slug" element={<Note />} />
          <Route path="/follow/:name" element={<Follow />} />
          <Route path="/follow/:name/player/:slug" element={<Player />} />
          <Route path="/atlas/:slug" element={<Atlas />} />
          <Route path="/atlas/:slug/concept/:cslug" element={<Concept />} />
          <Route path="/log/:topic" element={<LogTopic />} />
          <Route path="/log/:topic/entry/:slug" element={<LogEntry />} />

          {/* 廃止した3ルート */}
          <Route path="/notes" element={<Navigate to="/shelf" replace state={{ legacy: 'notes' }} />} />
          <Route path="/logs" element={<Navigate to="/shelf" replace state={{ legacy: 'logs' }} />} />
          <Route path="/moc/:slug" element={<LegacyMoc graph={graph} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomTabs />
      </HashRouter>
    </DataCtx.Provider>
  );
}
