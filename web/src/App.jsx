import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Heading, Text, Input, Button, VStack } from '@chakra-ui/react';
import { DataCtx } from './lib/ctx.js';
import { loadSite } from './lib/data.js';
import { buildIndex } from './lib/wiki.js';
import { Home, Follow, Player, Note, NotesIndex, Moc } from './pages.jsx';
import { Atlas, Concept } from './atlas.jsx';
import { Center, Loading } from './ui.jsx';
import { C, ACCENT_GRADIENT } from './theme.js';

function PasswordGate({ onSubmit, error }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); await onSubmit(pw); setBusy(false); };
  return (
    <Center>
      <Heading size="xl" color={C.ink} letterSpacing="-0.02em">muninn</Heading>
      <Text fontSize="sm" color={C.muted}>パスワードを入れるのだ</Text>
      <VStack gap="3" w="100%" maxW="300px" mt="2">
        <Input
          type="password"
          value={pw}
          placeholder="password"
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          color={C.ink}
          bg="rgba(255,255,255,.05)"
          border="1px solid"
          borderColor={C.line}
          borderRadius="14px"
          textAlign="center"
          _placeholder={{ color: C.faint }}
          _focus={{ borderColor: C.sky, outline: 'none' }}
        />
        <Button
          w="100%"
          onClick={submit}
          loading={busy}
          color="#08111f"
          fontWeight="700"
          bg={ACCENT_GRADIENT}
          borderRadius="14px"
          _hover={{ opacity: 0.92 }}
        >
          開く
        </Button>
        {error && <Text fontSize="sm" color={C.pink}>{error}</Text>}
      </VStack>
    </Center>
  );
}

export default function App() {
  const [state, setState] = useState({ status: 'loading', site: null, idx: null, error: '' });

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

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'needpass') return <PasswordGate onSubmit={submitPass} error={state.error} />;
  if (state.status === 'error') return <Center><Text color={C.muted}>読み込み失敗: {state.error}</Text></Center>;

  return (
    <DataCtx.Provider value={{ site: state.site, idx: state.idx }}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/follow/:name" element={<Follow />} />
          <Route path="/follow/:name/player/:slug" element={<Player />} />
          <Route path="/notes" element={<NotesIndex />} />
          <Route path="/note/:slug" element={<Note />} />
          <Route path="/moc/:slug" element={<Moc />} />
          <Route path="/atlas/:slug" element={<Atlas />} />
          <Route path="/atlas/:slug/concept/:cslug" element={<Concept />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </DataCtx.Provider>
  );
}
