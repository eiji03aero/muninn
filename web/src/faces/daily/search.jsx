// 「探す」——全件を作成順に並べ、文字列と属性（種別・テーマ）で絞り込む1枚。
//
// 以前のこの画面は「入力するまで何も出ない」検索だった。つまり**名前を覚えている人にしか効かず**、
// 覚えていないから探している人には空白を返していた。おまけに結果は種別ごとに折り畳まれ、
// 「いつ書いたか」が一切出なかったので、時系列で辿ることもできなかった。
// だから既定を**全件の作成順リスト**にして、検索語は絞り込みの1手段に格下げしている。
// テーマ（タグ）指定もここに吸収した——専用のテーマ画面は廃止し、`?tag=` で入ってくる
// （web/DESIGN.md 原則19）。
//
// ビルド時インデックスは作らない。site.json は復号済みで全メモリ上にあり、200ノード規模なら
// 素の indexOf の総当たりで数ミリ秒。過剰設計を避ける。
import { useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, Text, Input, Button } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { AppBar, Page, Slot, Card, CopyButton } from './ui.jsx';
import { typeLabel, tagLabel } from '../../lib/graph.js';
import { C, ACCENT_GRADIENT } from '../../shared/theme.js';

// 種別フィルタに出す順。一覧（lib/groups.js）と同じ並びにして、2画面で順序が割れないようにする。
const TYPE_ORDER = ['note', 'concept', 'logentry', 'session', 'entity', 'atlas', 'logtopic', 'follow', 'piece'];

const SORTS = [
  { id: 'new', label: '新しい順' },
  { id: 'old', label: '古い順' },
  { id: 'updated', label: '更新順' },
];

const PAGE = 40;
const TAGS_SHOWN = 8;

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

function Pill({ on, children, onClick }) {
  return (
    <Button size="xs" borderRadius="full" fontWeight="600" onClick={onClick}
      color={on ? '#08111f' : C.muted} bg={on ? ACCENT_GRADIENT : 'transparent'}
      border="1px solid" borderColor={on ? 'transparent' : C.line}
      _hover={{ color: on ? '#08111f' : C.ink }}>
      {children}
    </Button>
  );
}

export function Search() {
  const navigate = useNavigate();
  const { graph } = useData();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const tag = params.get('tag') || '';
  const sort = params.get('sort') || 'new';

  const [limit, setLimit] = useState(PAGE);

  const patch = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    setLimit(PAGE);
    setParams(p, { replace: true });
  };

  const all = useMemo(
    () => graph.nodes.filter((n) => n.type !== 'moc'), // 索引そのものは記事として数えない
    [graph],
  );

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
    const key = sort === 'updated' ? (n) => n.updated || n.created || '' : dateOf;
    const dir = sort === 'old' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = key(a), bv = key(b);
      if (av === bv) return a.short.localeCompare(b.short, 'ja'); // 同着はタイトルで（原則10）
      return av.localeCompare(bv) * dir;
    });
  }, [matched, type, sort]);

  const [allTags, setAllTags] = useState(false);
  const tagList = allTags ? graph.tags : graph.tags.slice(0, TAGS_SHOWN);
  const shown = results.slice(0, limit);
  const filtered = !!(q || type || tag);

  const askPrompt =
    `/mn 「${q || tagLabel(tag)}」について調べて、muninn に記録して。` +
    '客観的な事実は kind: knowledge の原子ノートにして、既存ノートと相互リンクすること。' +
    '（muninn の中を探したが見つからなかったので新規に調べてほしい）';

  return (
    <>
      <AppBar title="探す" back={false} subtitle={`${results.length}件`}>
        <Box mt="3">
          {/* autoFocus を付けない。PWA standalone では開いた瞬間にソフトキーボードが立ち上がり、
              下端固定のタブがキーボードの上へ押し上げられて「探すだけタブの位置が違う」状態になる。
              （Safari タブでは autoFocus が無視されるため、この差は standalone でだけ出ていた） */}
          {/* 入力値は URL（?q=）そのものを映す。別画面から `?q=` 付きで飛んできたときに
              入力欄だけ空という食い違いを起こさないため。打つたびに URL を書き換えるが
              履歴には積まない（1文字ごとに「戻る」が増えると戻れなくなる）。 */}
          <Input placeholder="本文もタグも横断して探す" value={q}
            onChange={(e) => patch({ q: e.target.value })}
            color={C.ink} bg="rgba(255,255,255,.05)" border="1px solid" borderColor={C.line}
            borderRadius="14px" _placeholder={{ color: C.faint }}
            _focus={{ borderColor: C.sky, outline: 'none' }} />
        </Box>
      </AppBar>
      <Page>
        <VStack align="stretch" gap="5">

          <Box>
            <Slot>種別</Slot>
            <Flex wrap="wrap" gap="2">
              <Pill on={!type} onClick={() => patch({ type: '' })}>
                すべて <Box as="span" color={type ? C.faint : 'inherit'} ml="1">{matched.length}</Box>
              </Pill>
              {TYPE_ORDER.filter((t) => counts[t]).map((t) => (
                <Pill key={t} on={type === t} onClick={() => patch({ type: type === t ? '' : t })}>
                  {typeLabel(t)} <Box as="span" ml="1" color={type === t ? 'inherit' : C.faint}>{counts[t]}</Box>
                </Pill>
              ))}
            </Flex>
          </Box>

          <Box>
            <Slot action={
              graph.tags.length > TAGS_SHOWN ? (
                <Button size="xs" variant="ghost" color={C.faint} px="1" flexShrink="0"
                  _hover={{ color: C.ink, bg: 'transparent' }}
                  onClick={() => setAllTags(!allTags)}>
                  {allTags ? '畳む' : `ぜんぶ（${graph.tags.length}）`}
                </Button>
              ) : null
            }>テーマ</Slot>
            <Flex wrap="wrap" gap="2">
              <Pill on={!tag} onClick={() => patch({ tag: '' })}>指定なし</Pill>
              {tagList.map((t) => (
                <Pill key={t.tag} on={tag === t.tag} onClick={() => patch({ tag: tag === t.tag ? '' : t.tag })}>
                  {t.label} <Box as="span" ml="1" color={tag === t.tag ? 'inherit' : C.faint}>{t.count}</Box>
                </Pill>
              ))}
              {/* 選んだテーマが上位に出ていないときも、選択中であることが見えるようにする */}
              {tag && !tagList.some((t) => t.tag === tag) && (
                <Pill on onClick={() => patch({ tag: '' })}>{tagLabel(tag)}</Pill>
              )}
            </Flex>
          </Box>

          <Box>
            <Slot>並び</Slot>
            <Flex wrap="wrap" gap="2">
              {SORTS.map((s) => (
                <Pill key={s.id} on={sort === s.id} onClick={() => patch({ sort: s.id })}>{s.label}</Pill>
              ))}
            </Flex>
          </Box>

          {results.length === 0 ? (
            <Card soft>
              <Text fontSize="sm" color={C.ink} fontWeight="600">
                {filtered ? 'この条件では見つからない' : 'まだ1件もない'}
              </Text>
              <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">
                探して無かったことが、次の蓄積の入口になる。
              </Text>
              <HStack gap="2" mt="3" wrap="wrap">
                <CopyButton text={askPrompt}>これを調べて記録してもらう</CopyButton>
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
          ) : (
            <Box>
              <Slot count={results.length}>{SORTS.find((s) => s.id === sort)?.label}</Slot>
              <VStack align="stretch" gap="2">
                {shown.map((n) => {
                  const snip = q ? (snippet(n.body, q) || snippet(haystack(n), q)) : null;
                  const d = sort === 'updated' ? (n.updated || n.created) : dateOf(n);
                  return (
                    <Card key={n.route} onClick={() => navigate(n.route)}>
                      <HStack justify="space-between" align="start" gap="2">
                        <Text fontSize="sm" color={C.ink} fontWeight="600" lineHeight="1.5">{n.short}</Text>
                        <Text fontSize="10px" color={C.faint} flexShrink="0" mt="1">{typeLabel(n.type)}</Text>
                      </HStack>
                      <HStack gap="2" mt="1.5" wrap="wrap">
                        {d && <Text fontSize="11px" color={C.faint}>{d}</Text>}
                        {(n.tags || []).filter((t) => t !== 'moc').slice(0, 3).map((t) => (
                          <Text key={t} fontSize="11px" color={C.faint}>· {tagLabel(t)}</Text>
                        ))}
                      </HStack>
                      {snip && (
                        <Text fontSize="11px" color={C.faint} mt="1.5" lineHeight="1.7">
                          {snip.pre}
                          <Box as="span" color={C.ink} fontWeight="700" bg="rgba(110,193,255,.16)" px="0.5">{snip.hit}</Box>
                          {snip.post}
                        </Text>
                      )}
                    </Card>
                  );
                })}
              </VStack>
              {results.length > shown.length && (
                <Button mt="4" w="100%" size="sm" borderRadius="12px" fontWeight="700" color={C.muted}
                  bg="transparent" border="1px solid" borderColor={C.line}
                  _hover={{ color: C.ink }} onClick={() => setLimit(limit + PAGE)}>
                  もっと見る（あと {results.length - shown.length}件）
                </Button>
              )}
            </Box>
          )}

        </VStack>
      </Page>
    </>
  );
}
