// 面「日報」——刷新時に作った現行のかたち。今日の紙面を上から読み、下のタブで横に移る。
//
// この面だけが HashRouter を持つ（面Aは方向で、面Bは欄の中身で移動するのでルータを持たない）。
// したがって**ルータに依存する仕組みはこの面の中で完結させる**こと。
// 逆に、shell に置いてよいのは「どの面でも同じ意味を持つもの」だけ。
import { useEffect, useLayoutEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { useData } from '../../lib/ctx.js';
import { tagToParam } from '../../lib/graph.js';
import { Note, Follow, Player } from './pages.jsx';
import { Edition } from './edition.jsx';
import { Shelf, ShelfBoard } from './shelf.jsx';
import { Search } from './search.jsx';
import { Desk } from './desk.jsx';
import { Atlas, Concept } from './atlas.jsx';
import { LogTopic, LogEntry } from './logs.jsx';
import { BottomTabs } from './ui.jsx';
import './daily.css';

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

export default function DailyRoot() {
  const { graph } = useData();
  return (
    <ChakraProvider value={defaultSystem}>
      {/* 面のCSSはこの属性の下に閉じる。選ばれていない面のスタイルが漏れないための境界。 */}
      <div className="face-daily" data-face="daily">
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

            {/* 設定は shell の持ち物。ここで受け止めておかないと下の `*` が入口へ書き戻し、
                shell が畳む前に hash を奪い返してしまう。 */}
            <Route path="/settings" element={null} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <BottomTabs />
        </HashRouter>
      </div>
    </ChakraProvider>
  );
}
