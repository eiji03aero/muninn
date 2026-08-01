import { useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, Text, Button } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { AppBar, Page, Slot, Card, Chip, CopyButton, Sparkline, Delta, NotFound, relDay, Md } from './ui.jsx';
import { tagLabel, tagToParam, paramToTag, typeLabel, cleanTitle } from '../../lib/graph.js';
import { effectiveSrs, todayISO } from '../../lib/recall.js';
import { C, ACCENT_GRADIENT, tint } from '../../shared/theme.js';

// 面積比例のツリーマップ（決定的・乱数なし）。
// 「何があるんだっけ」にリストではなく面積で答える。ゴルフが画面の4割を占める非対称を
// そのまま描くことに意味がある——均等グリッドに逃げると、偏りという事実が消える。
function treemap(items, x, y, w, h, out = []) {
  if (!items.length) return out;
  if (items.length === 1) { out.push({ ...items[0], x, y, w, h }); return out; }
  const total = items.reduce((s, i) => s + i.value, 0);
  let acc = 0, idx = 0;
  for (; idx < items.length - 1; idx++) {
    if (acc + items[idx].value > total / 2) break;
    acc += items[idx].value;
  }
  // 同値が並ぶと分割点が末尾まで進み、片側が空のまま自分を呼んで無限再帰になる。
  // 必ず両側に1つ以上残るよう詰める。
  idx = Math.min(idx, items.length - 2);
  const a = items.slice(0, idx + 1), b = items.slice(idx + 1);
  const frac = a.reduce((s, i) => s + i.value, 0) / total;
  if (w >= h) {
    treemap(a, x, y, w * frac, h, out);
    treemap(b, x + w * frac, y, w * (1 - frac), h, out);
  } else {
    treemap(a, x, y, w, h * frac, out);
    treemap(b, x, y + h * frac, w, h * (1 - frac), out);
  }
  return out;
}

const TILE_COLORS = [C.sky, C.violet, C.green, C.amber, C.orange, C.pink];

// 件数1のロングテールは、面積では点にしかならず文字も崩れる。ひとつの「その他」タイルに畳んで
// 押したら中身を出す。偏りは隠さないが、読めない絵にもしない。
const MIN_TILE = 2;

function InventoryMap({ tags, onOpen, onOther }) {
  const { boxes, tail } = useMemo(() => {
    const main = tags.filter((t) => t.count >= MIN_TILE);
    const rest = tags.filter((t) => t.count < MIN_TILE);
    const items = main.map((t, i) => ({ ...t, value: t.count, i }));
    if (rest.length) {
      items.push({
        tag: '__other', label: 'その他', count: rest.reduce((s, t) => s + t.count, 0),
        value: rest.reduce((s, t) => s + t.count, 0), i: items.length, other: true,
      });
    }
    return { boxes: treemap(items, 0, 0, 100, 100), tail: rest };
  }, [tags]);

  return (
    <>
      <Box position="relative" w="100%" style={{ aspectRatio: '1 / 0.86' }}>
        {boxes.map((b) => {
          const color = b.other ? C.faint : TILE_COLORS[b.i % TILE_COLORS.length];
          const short = b.h < 9;            // 高さが足りない＝件数を別行にできない
          const small = b.w < 26 || b.h < 15;
          return (
            <Box as="button" key={b.tag} position="absolute" className="press" textAlign="left"
              title={`${b.label} ${b.count}`}
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, padding: '2px' }}
              onClick={() => (b.other ? onOther() : onOpen(b.tag))}>
              <Box w="100%" h="100%" borderRadius="10px" px="1.5" py="1.5"
                overflow="hidden" border="1px solid" borderColor={tint(color, 34)} bg={tint(color, 13)}
                display="flex" flexDirection="column" justifyContent="space-between"
                _hover={{ bg: tint(color, 22) }}>
                {/* 狭いタイルで日本語が1文字ずつ縦に折れるのを、nowrap + 省略で構造的に止める */}
                <Text fontSize={small ? '10px' : '12.5px'} fontWeight="700" color={C.ink} lineHeight="1.25"
                  style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.label}
                </Text>
                {!short && (
                  <Text fontSize={small ? '9px' : '10px'} color={C.faint} lineHeight="1.2">{b.count}</Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
      {tail.length > 0 && (
        <Text fontSize="11px" color={C.faint} mt="2" lineHeight="1.6">
          その他 {tail.length}テーマ（{tail.map((t) => t.label).join(' · ')}）
        </Text>
      )}
    </>
  );
}

// ---------------- 棚 ----------------
export function Shelf() {
  const navigate = useNavigate();
  const { site, graph, shadow } = useData();
  const [cut, setCut] = useState(null);
  const today = todayISO();

  const orphans = graph.nodes.filter(
    (n) => n.type !== 'moc' && (graph.backlinks.get(n.route)?.length || 0) === 0 && n.type === 'note',
  );
  const stubs = (site.atlases || []).flatMap((a) => a.concepts.filter((c) => c.status === 'stub'));
  const neverRecalled = site.notes.filter((n) => n.kind === 'knowledge' && !effectiveSrs(n, shadow)?.last);

  const CUTS = [
    { id: 'new', label: '新着', items: () => graph.nodes.filter((n) => n.updated && n.type !== 'moc').sort((a, b) => (a.updated < b.updated ? 1 : -1)).slice(0, 12) },
    { id: 'old', label: '久しく読んでない', items: () => graph.nodes.filter((n) => n.type === 'note' && n.updated).sort((a, b) => (a.updated < b.updated ? -1 : 1)).slice(0, 12) },
    { id: 'orphan', label: `孤立している ${orphans.length}`, items: () => orphans, hide: orphans.length === 0 },
    { id: 'stub', label: `未執筆の章 ${stubs.length}`, items: () => [], hide: stubs.length === 0, custom: 'stub' },
    { id: 'never', label: `一度も再読していない ${neverRecalled.length}`, items: () => neverRecalled.map((n) => graph.byRoute.get(`/note/${n.slug}`)).filter(Boolean).slice(0, 12) },
    // 面積マップで「その他」に畳んだロングテールの中身
    { id: 'tail', label: 'その他のテーマ', hideFromPills: true,
      items: () => graph.tags.filter((t) => t.count < 2).flatMap((t) => t.nodes) },
  ].filter((c) => !c.hide);

  const active = CUTS.find((c) => c.id === cut);
  const list = active ? active.items() : [];

  // タグが3件未満のときは面積マップを出さずフラットな全件に落とす
  const useMap = graph.tags.length >= 3;

  return (
    <>
      <AppBar title="棚" back={false}
        subtitle={`${site.notes.length}記事 · ${(site.atlases || []).reduce((s, a) => s + a.concepts.length, 0)}章 · ${site.follows.reduce((s, f) => s + f.sessions.length, 0)}観測 · ${(site.logtopics || []).reduce((s, t) => s + t.entries.length, 0)}記録`} />
      <Page>
        <VStack align="stretch" gap="6">

          <Box>
            <Slot>在庫マップ</Slot>
            {useMap ? (
              <InventoryMap tags={graph.tags} onOpen={(t) => navigate(`/shelf/${tagToParam(t)}`)}
                onOther={() => setCut('tail')} />
            ) : (
              <VStack align="stretch" gap="2">
                {graph.nodes.filter((n) => n.type === 'note').map((n) => (
                  <Card key={n.route} onClick={() => navigate(n.route)}>
                    <Text fontSize="sm" color={C.ink}>{n.title}</Text>
                  </Card>
                ))}
              </VStack>
            )}
          </Box>

          <Box>
            <Slot>切り口</Slot>
            <Flex wrap="wrap" gap="2">
              {CUTS.filter((c) => !c.hideFromPills).map((c) => {
                const on = cut === c.id;
                return (
                  <Button key={c.id} size="xs" borderRadius="full" fontWeight="600"
                    onClick={() => setCut(on ? null : c.id)}
                    color={on ? '#08111f' : C.muted} bg={on ? ACCENT_GRADIENT : 'transparent'}
                    border="1px solid" borderColor={on ? 'transparent' : C.line}
                    _hover={{ color: on ? '#08111f' : C.ink }}>
                    {c.label}
                  </Button>
                );
              })}
            </Flex>

            {active && (
              <VStack align="stretch" gap="2" mt="3">
                {active.custom === 'stub' ? (
                  (site.atlases || []).flatMap((a) =>
                    a.concepts.filter((c) => c.status === 'stub').map((c) => (
                      <Card key={c.slug} onClick={() => navigate(`/atlas/${a.slug}/concept/${c.slug}`)}>
                        <Text fontSize="sm" color={C.ink} fontWeight="600">{c.title}</Text>
                        <Text fontSize="xs" color={C.faint} mt="1">{c.gist}</Text>
                      </Card>
                    )),
                  )
                ) : list.length === 0 ? (
                  <Text fontSize="sm" color={C.muted}>該当なし</Text>
                ) : (
                  list.map((n) => (
                    <Card key={n.route} onClick={() => navigate(n.route)}>
                      <HStack justify="space-between" align="start" gap="2">
                        <Text fontSize="sm" color={C.ink} fontWeight="600" lineHeight="1.5">{n.short}</Text>
                        <Text fontSize="10px" color={C.faint} flexShrink="0" mt="1">{typeLabel(n.type)}</Text>
                      </HStack>
                      {n.updated && <Text fontSize="11px" color={C.faint} mt="1">{relDay(n.updated, today)}</Text>}
                    </Card>
                  ))
                )}
              </VStack>
            )}
          </Box>

          {graph.bundles.length > 0 && (
            <Box>
              <Slot>編集済みの束</Slot>
              <Flex wrap="wrap" gap="2">
                {graph.bundles.map((b) => (
                  <Button key={b.id} size="xs" variant="outline" borderRadius="full" color={C.muted}
                    borderColor={C.line} _hover={{ color: C.ink, bg: 'rgba(255,255,255,.05)' }}
                    onClick={() => navigate(`/shelf/${tagToParam(b.tag || '')}`)}>
                    {b.title} <Box as="span" color={C.faint} ml="1">{b.items.length}</Box>
                  </Button>
                ))}
              </Flex>
            </Box>
          )}

        </VStack>
      </Page>
    </>
  );
}

// ---------------- 棚板（タグ横断） ----------------
export function ShelfBoard() {
  const navigate = useNavigate();
  const { graph } = useData();
  const { tag: param } = useParams();
  const tag = paramToTag(param);
  const entry = graph.tagIndex.get(tag);
  const today = todayISO();
  if (!entry) return <NotFound what="棚板" />;

  const bundles = graph.bundles.filter((b) => b.tag === tag);
  const follows = entry.nodes.filter((n) => n.type === 'follow');
  const loose = entry.nodes.filter(
    (n) => !graph.inBundle.has(n.route) && ['note', 'concept'].includes(n.type),
  );
  const rest = entry.nodes.filter((n) => !['follow', 'session'].includes(n.type));

  const regenPrompt =
    `/mn-regen-moc 「${tagLabel(tag)}」（タグ ${tag}）の索引を作り直して。` +
    `いま MOC のどのセクションにも入っていない記事が ${loose.length} 件ある。` +
    `内容を読んで適切な見出しに束ね直し、必要なら新しいセクションを立てて。`;

  return (
    <>
      <AppBar title={tagLabel(tag)}
        subtitle={Object.entries(entry.byType).map(([t, c]) => `${typeLabel(t)} ${c}`).join(' · ')} />
      <Page>
        <VStack align="stretch" gap="6">

          {bundles.length > 0 && (
            <Box>
              <Slot>編集済みの束</Slot>
              <VStack align="stretch" gap="3">
                {bundles.map((b) => (
                  <Card key={b.id}>
                    <Text fontSize="sm" color={C.ink} fontWeight="700" mb="2">{b.title}</Text>
                    <VStack align="stretch" gap="0">
                      {b.items.map((it) => (
                        <Box as="button" key={it.node.route} textAlign="left" className="press" py="1.5"
                          onClick={() => navigate(it.node.route)}>
                          <Text fontSize="sm" color={C.sky} lineHeight="1.5">○ {it.label || it.node.short}</Text>
                          {it.reason && <Text fontSize="11px" color={C.faint} lineHeight="1.5">{it.reason}</Text>}
                        </Box>
                      ))}
                    </VStack>
                  </Card>
                ))}
              </VStack>
            </Box>
          )}

          {follows.length > 0 && (
            <Box>
              <Slot>この棚の観測</Slot>
              <VStack align="stretch" gap="3">
                {follows.map((n) => {
                  const f = n.ref;
                  const usable = (f.series || []).filter((x) => x.points.length >= 2);
                  const s = usable.find((x) => x.goal) || usable[0];
                  return (
                    <Card key={n.route} onClick={() => navigate(n.route)}>
                      <HStack justify="space-between" mb={s ? '2' : '0'}>
                        <Text fontSize="sm" color={C.ink} fontWeight="700">{cleanTitle(f.title)}</Text>
                        <Text fontSize="xs" color={C.faint}>{f.sessions.length}回 ›</Text>
                      </HStack>
                      {s && (
                        <>
                          <HStack justify="space-between" align="baseline" mb="0.5">
                            <Text fontSize="11px" color={C.muted}>{s.key}</Text>
                            <Delta points={s.points} goal={s.goal} />
                          </HStack>
                          <Sparkline points={s.points} height={30} goal={s.goal} />
                        </>
                      )}
                    </Card>
                  );
                })}
              </VStack>
            </Box>
          )}

          {loose.length > 0 && bundles.length > 0 && (
            <Box>
              <Slot count={loose.length}>束に入っていない</Slot>
              <Card soft>
                <VStack align="stretch" gap="0">
                  {loose.slice(0, 8).map((n) => (
                    <Box as="button" key={n.route} textAlign="left" className="press" py="1.5"
                      onClick={() => navigate(n.route)}>
                      <Text fontSize="sm" color={C.ink} lineHeight="1.5">○ {n.short}</Text>
                    </Box>
                  ))}
                  {loose.length > 8 && <Text fontSize="xs" color={C.faint} mt="1">＋{loose.length - 8}件</Text>}
                </VStack>
                <Box mt="3"><CopyButton text={regenPrompt}>索引を作り直す依頼</CopyButton></Box>
              </Card>
            </Box>
          )}

          <Box>
            <Slot count={rest.length}>この棚のすべて</Slot>
            <VStack align="stretch" gap="2">
              {rest.map((n) => (
                <Card key={n.route} onClick={() => navigate(n.route)}>
                  <HStack justify="space-between" align="start" gap="2">
                    <Text fontSize="sm" color={C.ink} fontWeight="600" lineHeight="1.5">{n.short}</Text>
                    <Text fontSize="10px" color={C.faint} flexShrink="0" mt="1">{typeLabel(n.type)}</Text>
                  </HStack>
                </Card>
              ))}
            </VStack>
          </Box>

        </VStack>
      </Page>
    </>
  );
}
