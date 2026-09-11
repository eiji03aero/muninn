// 面「日報」——刷新時に作った現行のかたち。今日の紙面を上から読み、下のタブで横に移る。
//
// この面だけが HashRouter を持つ（面Aは方向で、面Bは欄の中身で移動するのでルータを持たない）。
// したがって**ルータに依存する仕組みはこの面の中で完結させる**こと。
// 逆に、shell に置いてよいのは「どの面でも同じ意味を持つもの」だけ。
import { useEffect, useLayoutEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { useData } from '../../lib/ctx.js';
import { paramToTag } from '../../lib/graph.js';
import { Note, Follow, Player } from './pages.jsx';
import { Edition } from './edition.jsx';
import { Groups, GroupList } from './groups.jsx';
import { Search } from './search.jsx';
import { Piece } from './piece.jsx';
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

// 旧ルートの着地。PWA のホーム追加やブックマークから旧URLが踏まれるのは実運用で必ず起きるので、
// 廃止した画面は必ず後継へ送る（404 にしない）。
// 索引（MOC）はテーマ単位の束なので、その束のテーマで探すへ送る。
function LegacyMoc({ graph }) {
  const { slug } = useParams();
  const bundle = graph.bundles.find((b) => b.moc === slug && b.tag);
  return <Navigate to={bundle ? `/search?tag=${encodeURIComponent(bundle.tag)}` : '/groups'} replace />;
}

// 旧「テーマ1枚」（/shelf/:tag）。テーマ指定の検索がその役目を継いだ。
function LegacyShelfTag() {
  const { tag } = useParams();
  return <Navigate to={`/search?tag=${encodeURIComponent(paramToTag(tag))}`} replace />;
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
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:id" element={<GroupList />} />
            <Route path="/search" element={<Search />} />
            <Route path="/desk" element={<Desk />} />

            <Route path="/note/:slug" element={<Note />} />
            <Route path="/follow/:name" element={<Follow />} />
            <Route path="/follow/:name/player/:slug" element={<Player />} />
            <Route path="/atlas/:slug" element={<Atlas />} />
            <Route path="/atlas/:slug/concept/:cslug" element={<Concept />} />
            <Route path="/log/:topic" element={<LogTopic />} />
            <Route path="/log/:topic/entry/:slug" element={<LogEntry />} />
            <Route path="/piece/:slug" element={<Piece />} />

            {/* 廃止したルート。網羅は「一覧」に、絞り込みは「探す」に吸収された */}
            <Route path="/notes" element={<Navigate to="/groups/note" replace />} />
            <Route path="/logs" element={<Navigate to="/groups/logtopic" replace />} />
            <Route path="/series" element={<Navigate to="/groups" replace />} />
            <Route path="/shelf" element={<Navigate to="/search" replace />} />
            <Route path="/shelf/:tag" element={<LegacyShelfTag />} />
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
