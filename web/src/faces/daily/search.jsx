// 「探す」——全件を作成順に並べ、文字列と属性（種別・テーマ）で絞り込む1枚。
//
// 以前のこの画面は「入力するまで何も出ない」検索だった。つまり**名前を覚えている人にしか効かず**、
// 覚えていないから探している人には空白を返していた。だから既定を**全件の作成順リスト**にして、
// 検索語は絞り込みの1手段に格下げしている（web/DESIGN.md 原則19）。
//
// 2026-10-17 に2つ変えた:
// - `一覧` を畳んでここに吸収した。種別で入れ物（Series・Logbook・Tracker・Writing）を選ぶと、
//   一覧と同じく進捗や件数の付いたカードで全件が出る。だから種別の並びは**入れ物が先**。
// - 絞り込みのピル（種別10＋テーマ9＋並び3）がファーストビューの半分を埋めていたので、
//   種別は横スクロールの1行、テーマは下から出すシート、並びはセレクトに畳んだ。
//   開いた瞬間に見えるべきなのは結果であって、絞り込みの設定ではない。
//
// ビルド時インデックスは作らない。site.json は復号済みで全メモリ上にあり、数百ノード規模なら
// 素の indexOf の総当たりで数ミリ秒。過剰設計を避ける。
import { useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, Text, Input, Button } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { Page, Card, Chip, CopyButton, relDay } from './ui.jsx';
import { typeLabel, tagLabel } from '../../lib/graph.js';
import { buildGroups, groupById } from '../../lib/groups.js';
import { todayISO } from '../../lib/recall.js';
import { C, ACCENT_GRADIENT } from '../../shared/theme.js';

// 種別の並び。入れ物（増えていく束）が先、単発の中身が後。2つの間に区切りを入れる。
const CONTAINER_TYPES = ['atlas', 'logtopic', 'follow', 'piece'];
const ITEM_TYPES = ['note', 'concept', 'logentry', 'session', 'entity'];
const isContainer = (t) => CONTAINER_TYPES.includes(t);

const GROUP_COLOR = {
  atlas: C.violet, logtopic: C.green, follow: C.amber, piece: C.pink,
};

const SORTS = [
  { id: 'new', label: '新しい順' },
  { id: 'old', label: '古い順' },
  { id: 'updated', label: '更新順' },
];

const PAGE = 40;

// ノードの「いつ」。入れ物（連載・定点）は created を持たないので最終更新で代替する。
const dateOf = (n) => n.created || n.updated || '';

// 干し草（検索対象の文字列）。記録はスキーマの値も、章は要旨も含める。
const haystack = (n) => [
  n.title, (n.tags || []).join(' '), n.body,
  n.type === 'logentry' ? Object.values(n.ref.fields || {}).join(' ') : '',
  n.type === 'concept' ? n.ref.gist || '' : '',
  n.type === 'piece' ? n.ref.prompt || '' : '',
].join('\n');

function snippet(text, q) {
  const i = (text || '').toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return null;
  const from = Math.max(0, i - 40);
  const to = Math.min(text.length, i + q.length + 40);
  return {
    pre: (from > 0 ? '…' : '') + text.slice(from, i),
    hit: text.slice(i, i + q.length),
    post: text.slice(i + q.length, to) + (to < text.length ? '…' : ''),
  };
}

function KindChip({ on, label, count, onClick }) {
  return (
    <Box as="button" type="button" onClick={onClick} flexShrink="0" h="34px" px="3" borderRadius="full"
      fontSize="13px" fontWeight="600" whiteSpace="nowrap" aria-pressed={on}
      color={on ? '#08111f' : C.muted} bg={on ? ACCENT_GRADIENT : 'transparent'}
      border="1px solid" borderColor={on ? 'transparent' : C.line}>
      {label}
      <Box as="span" ml="1.5" fontSize="12px" fontWeight="700" color={on ? '#08111f' : C.faint}>{count}</Box>
    </Box>
  );
}

const Sep = () => <Box flexShrink="0" w="1px" h="20px" alignSelf="center" bg="rgba(255,255,255,.16)" mx="1" aria-hidden="true" />;

const filterBtn = {
  h: '32px', px: '2.5', borderRadius: '10px', fontSize: '12px', fontWeight: '600', color: '#dfe3f2',
  bg: 'rgba(255,255,255,.05)', border: '1px solid', borderColor: C.line,
  display: 'inline-flex', alignItems: 'center', gap: '1.5',
};

// テーマ選択のシート。テーマは数十あり、ピルで並べると画面の半分を食うので、
// 押したときだけ下から出して、そこで名前で絞れるようにする。
function ThemeSheet({ tags, value, onPick, onClose }) {
  const [q, setQ] = useState('');
  const lc = q.trim().toLowerCase();
  const list = lc ? tags.filter((t) => `${t.label} ${t.tag}`.toLowerCase().includes(lc)) : tags;
  const Option = ({ id, label, count }) => {
    const on = value === id;
    return (
      <Flex as="button" type="button" role="radio" aria-checked={on} onClick={() => onPick(id)}
        w="100%" align="center" gap="3" minH="48px" px="1" textAlign="left" borderTop={`1px solid ${C.line}`}>
        <Box w="18px" h="18px" borderRadius="full" flexShrink="0" border="2px solid"
          borderColor={on ? C.sky : 'rgba(255,255,255,.3)'}
          style={{ boxShadow: on ? `inset 0 0 0 3px #141628, inset 0 0 0 9px ${C.sky}` : 'none' }} />
        <Text flex="1" fontSize="15px" color={C.ink}>{label}</Text>
        {count != null && <Text fontSize="12px" color={C.faint} style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</Text>}
      </Flex>
    );
  };
  return (
    <Box position="fixed" inset="0" zIndex="50">
      <Box as="button" type="button" aria-label="閉じる" position="absolute" inset="0" bg="rgba(4,5,12,.62)"
        onClick={onClose} />
      <Flex role="dialog" aria-modal="true" aria-label="テーマで絞る" direction="column"
        position="absolute" left="0" right="0" bottom="0" maxH="75vh" px="4" pt="2"
        borderTopRadius="22px" bg="#141628" borderTop="1px solid rgba(255,255,255,.14)"
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', boxShadow: '0 -20px 40px -10px rgba(0,0,0,.6)' }}>
        <Box w="36px" h="5px" borderRadius="full" bg="rgba(255,255,255,.22)" mx="auto" mb="2.5" aria-hidden="true" />
        <Flex align="center" justify="space-between" mb="2">
          <Text fontSize="16px" fontWeight="700" color={C.ink}>テーマで絞る</Text>
          <Button size="sm" variant="ghost" color={C.sky} px="1" _hover={{ bg: 'transparent' }} onClick={onClose}>閉じる</Button>
        </Flex>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="テーマ名で探す" aria-label="テーマ名で探す"
          h="38px" minH="38px" flexShrink="0" mb="2" fontSize="14px" color={C.ink} bg="rgba(255,255,255,.06)" border="1px solid"
          borderColor={C.line} borderRadius="10px" _placeholder={{ color: C.faint }}
          _focus={{ borderColor: C.sky, outline: 'none' }} />
        <Box role="radiogroup" aria-label="テーマ" flex="1" overflowY="auto" minH="0">
          {!lc && <Option id="" label="すべて" />}
          {list.map((t) => <Option key={t.tag} id={t.tag} label={t.label} count={t.count} />)}
          {list.length === 0 && <Text fontSize="sm" color={C.muted} py="4">そのテーマは無い</Text>}
        </Box>
      </Flex>
    </Box>
  );
}

function Bar({ pct }) {
  return (
    <Box mt="2.5" h="5px" borderRadius="full" bg="rgba(255,255,255,.08)" overflow="hidden">
      <Box h="100%" borderRadius="full" bg={ACCENT_GRADIENT} style={{ width: `${pct}%` }} />
    </Box>
  );
}

// 入れ物のカード（旧「一覧」のカード）。進捗・件数・説明の一言を持つ。
function ContainerCard({ item, color, today, onOpen }) {
  return (
    <Card onClick={() => onOpen(item.route)}>
      <HStack justify="space-between" align="start" gap="2.5">
        <Text fontSize="15px" fontWeight="700" color={C.ink} lineHeight="1.5">{item.title}</Text>
        {item.badge && <Box flexShrink="0"><Chip color={color}>{item.badge}</Chip></Box>}
      </HStack>
      {item.gist && (
        <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.gist}
        </Text>
      )}
      <HStack justify="space-between" align="baseline" gap="2" mt="2.5">
        <Text fontSize="11px" color={C.faint} lineHeight="1.5">{item.meta}</Text>
        <Text fontSize="11px" color={C.faint} flexShrink="0">{relDay(item.date, today)}</Text>
      </HStack>
      {item.progress != null && <Bar pct={Math.round(item.progress * 100)} />}
    </Card>
  );
}

export function Search() {
  const navigate = useNavigate();
  const { site, graph, reads } = useData();
  const [params, setParams] = useSearchParams();
  const today = todayISO();

  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const tag = params.get('tag') || '';
  const sort = params.get('sort') || 'new';

  const [limit, setLimit] = useState(PAGE);
  const [sheet, setSheet] = useState(false);

  const patch = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    setLimit(PAGE);
    setParams(p, { replace: true });
  };
  // 入れ物は「最近動いた順」で見るのが自然なので、選んだ時点で並びを更新順にする（旧「一覧」の並び）。
  const pickType = (t) => {
    patch({ type: t, sort: isContainer(t) ? 'updated' : '' });
    window.scrollTo(0, 0);
  };

  const all = useMemo(
    () => graph.nodes.filter((n) => n.type !== 'moc'), // 索引そのものは記事として数えない
    [graph],
  );
  // 入れ物のカードに出す進捗・件数・説明（旧「一覧」の素材）。route で引く。
  const containerItems = useMemo(() => {
    const m = new Map();
    for (const g of buildGroups(site, reads)) for (const it of g.items) m.set(it.route, it);
    return m;
  }, [site, reads]);

  // テーマと文字列で絞ったところまで（種別フィルタは当てない）。種別ごとの件数はここから数える
  // ——押す前に「その種別に何件あるか」が見えないと、絞り込みが当てものになる。
  const matched = useMemo(() => {
    const lc = q.trim().toLowerCase();
    return all
      .filter((n) => !tag || (n.tags || []).includes(tag))
      .filter((n) => !lc || haystack(n).toLowerCase().includes(lc));
  }, [all, q, tag]);

  const counts = useMemo(() => {
    const m = {};
    for (const n of matched) m[n.type] = (m[n.type] || 0) + 1;
    return m;
  }, [matched]);

  const results = useMemo(() => {
    const list = matched.filter((n) => !type || n.type === type);
    // 入れ物の「更新」は中身の最終更新（カードに出している日付）で数える。並びの軸と表示日を割らない。
    const updatedOf = (n) => containerItems.get(n.route)?.date || n.updated || n.created || '';
    const key = sort === 'updated' ? updatedOf : dateOf;
    const dir = sort === 'old' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = key(a), bv = key(b);
      if (av === bv) return a.short.localeCompare(b.short, 'ja'); // 同着はタイトルで（原則10）
      return av.localeCompare(bv) * dir;
    });
  }, [matched, type, sort, containerItems]);

  const shown = results.slice(0, limit);
  const filtered = !!(q || type || tag);
  const group = groupById(type);
  const rubric = site.writings?.rubric;
  const containers = CONTAINER_TYPES.filter((t) => counts[t]);
  const items = ITEM_TYPES.filter((t) => counts[t]);

  const askPrompt =
    `/mn 「${q || tagLabel(tag)}」について調べて、muninn に記録して。` +
    '客観的な事実は kind: knowledge の原子ノートにして、既存ノートと相互リンクすること。' +
    '（muninn の中を探したが見つからなかったので新規に調べてほしい）';

  return (
    <>
      <Box className="glass-bar" position="sticky" top="0" zIndex="20" px="4" pb="3"
        style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}>
        {/* autoFocus を付けない。PWA standalone では開いた瞬間にソフトキーボードが立ち上がり、
            下端固定のタブがキーボードの上へ押し上げられて「探すだけタブの位置が違う」状態になる。 */}
        {/* 入力値は URL（?q=）そのものを映す。打つたびに URL を書き換えるが履歴には積まない。 */}
        <Box position="relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="2"
            strokeLinecap="round" aria-hidden="true" style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }}>
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <Input type="search" aria-label="探す" placeholder="本文もタグも横断して探す" value={q}
            onChange={(e) => patch({ q: e.target.value })}
            h="40px" pl="9" fontSize="14px"
            color={C.ink} bg="rgba(255,255,255,.06)" border="1px solid" borderColor={C.line}
            borderRadius="12px" _placeholder={{ color: C.faint }}
            _focus={{ borderColor: C.sky, outline: 'none' }} />
        </Box>

        {/* 種別。狭い端末では折り返さず横スクロールに逃がす（折り返すと高さが揺れる） */}
        <Flex role="group" aria-label="種別" gap="1.5" mt="3" mx="-4" px="4" overflowX="auto"
          style={{ scrollbarWidth: 'none' }}>
          <KindChip on={!type} label="すべて" count={matched.length} onClick={() => pickType('')} />
          {containers.length > 0 && <Sep />}
          {containers.map((t) => (
            <KindChip key={t} on={type === t} label={typeLabel(t)} count={counts[t]} onClick={() => pickType(type === t ? '' : t)} />
          ))}
          {items.length > 0 && <Sep />}
          {items.map((t) => (
            <KindChip key={t} on={type === t} label={typeLabel(t)} count={counts[t]} onClick={() => pickType(type === t ? '' : t)} />
          ))}
          {/* 選んだ種別がいまの条件で0件でも、選択中であることは見えるようにする */}
          {type && !counts[type] && <KindChip on label={typeLabel(type)} count={0} onClick={() => pickType('')} />}
        </Flex>

        <Flex align="center" gap="2" mt="2.5">
          <Box as="button" type="button" {...filterBtn} onClick={() => setSheet(true)} aria-haspopup="dialog">
            <Box as="span" color={C.faint} fontWeight="500">テーマ</Box>
            <Box as="span" maxW="9em" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{tag ? tagLabel(tag) : 'すべて'}</Box>
            <Box as="span" color={C.faint} aria-hidden="true">▾</Box>
          </Box>
          {tag && (
            <Box as="button" type="button" aria-label="テーマの指定を外す" onClick={() => patch({ tag: '' })}
              h="32px" w="32px" borderRadius="10px" color={C.muted} fontSize="14px"
              border="1px solid" borderColor={C.line}>×</Box>
          )}
          <Box as="label" {...filterBtn} position="relative">
            <Box as="span" color={C.faint} fontWeight="500">並び</Box>
            {SORTS.find((s) => s.id === sort)?.label}
            <Box as="span" color={C.faint} aria-hidden="true">▾</Box>
            <select aria-label="並び" value={sort} onChange={(e) => patch({ sort: e.target.value === 'new' ? '' : e.target.value })}
              style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer' }}>
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Box>
          <Text ml="auto" fontSize="12px" color={C.faint} flexShrink="0">{results.length}件</Text>
        </Flex>
      </Box>

      <Page>
        <VStack align="stretch" gap="4">

          {group && <Text fontSize="xs" color={C.muted} lineHeight="1.6">{group.lead}</Text>}

          {/* 作品だけは「どの軸で採点しているか」を先に出す。軸が固定されていることが仕組みの肝で、
              点だけ並べても何を測っているか分からない。 */}
          {type === 'piece' && rubric?.axes?.length > 0 && (
            <Card soft>
              <Text fontSize="sm" color={C.ink} fontWeight="700">毎回この5軸で採点する</Text>
              <VStack align="stretch" gap="1.5" mt="2">
                {rubric.axes.map((a) => (
                  <Text key={a.key} fontSize="xs" color={C.muted} lineHeight="1.7">
                    <b style={{ color: C.ink }}>{a.label}</b> — {a.desc}
                  </Text>
                ))}
              </VStack>
            </Card>
          )}

          {results.length === 0 ? (
            <Card soft>
              <Text fontSize="sm" color={C.ink} fontWeight="600">
                {filtered ? 'この条件では見つからない' : 'まだ1件もない'}
              </Text>
              <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">
                探して無かったことが、次の蓄積の入口になる。
              </Text>
              <HStack gap="2" mt="3" wrap="wrap">
                {(q || tag) && <CopyButton text={askPrompt}>これを調べて記録してもらう</CopyButton>}
                {filtered && (
                  <Button size="sm" borderRadius="12px" fontWeight="600" color={C.muted}
                    bg="transparent" border="1px solid" borderColor={C.line}
                    _hover={{ color: C.ink }}
                    onClick={() => patch({ q: '', type: '', tag: '' })}>
                    条件を外す
                  </Button>
                )}
              </HStack>
            </Card>
          ) : isContainer(type) ? (
            <VStack align="stretch" gap="3">
              {shown.map((n) => {
                const it = containerItems.get(n.route);
                return it
                  ? <ContainerCard key={n.route} item={it} today={today} color={GROUP_COLOR[type]} onOpen={(r) => navigate(r)} />
                  : <Card key={n.route} onClick={() => navigate(n.route)}><Text fontSize="sm" fontWeight="700" color={C.ink}>{n.short}</Text></Card>;
              })}
            </VStack>
          ) : (
            <Box className="glass-soft" px="4">
              {shown.map((n, i) => {
                const snip = q ? (snippet(n.body, q) || snippet(haystack(n), q)) : null;
                const d = sort === 'updated' ? (n.updated || n.created) : dateOf(n);
                return (
                  <Box as="button" key={n.route} w="100%" textAlign="left" className="press" py="3"
                    borderTop={i ? `1px solid ${C.line}` : 'none'} onClick={() => navigate(n.route)}>
                    <Text fontSize="sm" color={C.ink} fontWeight="600" lineHeight="1.5"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {n.short}
                    </Text>
                    <HStack gap="2" mt="1" wrap="wrap" fontSize="11px" color={C.faint}>
                      <Text as="span" color={C.muted} fontWeight="700">{typeLabel(n.type)}</Text>
                      {d && <Text as="span">{d}</Text>}
                      {(n.tags || []).filter((t) => t !== 'moc').slice(0, 2).length > 0 && (
                        <Text as="span">{(n.tags || []).filter((t) => t !== 'moc').slice(0, 2).map(tagLabel).join(' · ')}</Text>
                      )}
                    </HStack>
                    {snip && (
                      <Text fontSize="11px" color={C.faint} mt="1.5" lineHeight="1.7">
                        {snip.pre}
                        <Box as="span" color={C.ink} fontWeight="700" bg="rgba(110,193,255,.16)" px="0.5">{snip.hit}</Box>
                        {snip.post}
                      </Text>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {results.length > shown.length && (
            <Button w="100%" size="sm" borderRadius="12px" fontWeight="700" color={C.muted}
              bg="transparent" border="1px solid" borderColor={C.line}
              _hover={{ color: C.ink }} onClick={() => setLimit(limit + PAGE)}>
              もっと見る（あと {results.length - shown.length}件）
            </Button>
          )}

        </VStack>
      </Page>

      {sheet && (
        <ThemeSheet tags={graph.tags} value={tag}
          onPick={(t) => { patch({ tag: t }); setSheet(false); }}
          onClose={() => setSheet(false)} />
      )}
    </>
  );
}
