// 「一覧」——種類（グループ）ごとに、蓄積の全件へ到達する画面。
//
// この画面が答えるのは1問だけ:「何の種類のものが、いくつあって、それは何か」。
// 以前ここには「テーマ（タグの面積マップ）」と「続きもの」の2画面があったが、
// 面積マップは種類を答えず、続きもの（連載・記録帖・定点）は記事と作品を含まなかった。
// 網羅の入口を種類1本に統合し、絞り込みは「探す」に渡す（web/DESIGN.md 原則19）。
import { useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, Text, Button } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { AppBar, Page, Slot, Card, Chip, CopyButton, NotFound, relDay } from './ui.jsx';
import { buildGroups, groupById, resumeChapters } from '../../lib/groups.js';
import { todayISO } from '../../lib/recall.js';
import { C, ACCENT_GRADIENT } from '../../shared/theme.js';

const GROUP_COLOR = {
  note: C.sky, atlas: C.violet, logtopic: C.green, follow: C.amber, piece: C.pink,
};

// 1ページの表示件数。記事は90件超あるので、全件を一度に描かず「もっと見る」で伸ばす。
const PAGE = 50;

const NEW_PROMPT = {
  atlas: '/mn-learn 〜について学びたいので、学習アトラス（知識グラフ＋読む順路）を作って。',
  logtopic: '/mn-log 〜を記録したい。記録項目（スキーマ）を設計して。',
  follow: '/mn-follow 〜を定点観測したい。トラックを作って。',
  piece: '/mn-write お題をちょうだい。',
  note: '/mn 〜について調べて、notes に記録して。',
};

function Bar({ pct }) {
  return (
    <Box mt="2.5" h="5px" borderRadius="full" bg="rgba(255,255,255,.08)" overflow="hidden">
      <Box h="100%" borderRadius="full" bg={ACCENT_GRADIENT} style={{ width: `${pct}%` }} />
    </Box>
  );
}

function ItemCard({ item, color, today, onOpen }) {
  return (
    <Card onClick={() => onOpen(item.route)}>
      <HStack justify="space-between" align="start" gap="2.5">
        <Text fontSize="sm" fontWeight="700" color={C.ink} lineHeight="1.5">{item.title}</Text>
        {item.badge && <Box flexShrink="0"><Chip color={color}>{item.badge}</Chip></Box>}
      </HStack>
      {item.gist && (
        <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.gist}
        </Text>
      )}
      <HStack justify="space-between" align="baseline" gap="2" mt="2">
        <Text fontSize="11px" color={C.faint} lineHeight="1.5">{item.meta}</Text>
        <Text fontSize="11px" color={C.faint} flexShrink="0">{relDay(item.date, today)}</Text>
      </HStack>
      {item.progress != null && <Bar pct={Math.round(item.progress * 100)} />}
    </Card>
  );
}

// ---------------- 一覧（グループの目次） ----------------
export function Groups() {
  const navigate = useNavigate();
  const { site, reads } = useData();
  const today = todayISO();

  const groups = useMemo(() => buildGroups(site, reads), [site, reads]);
  const resume = useMemo(() => resumeChapters(site, reads), [site, reads]);

  return (
    <>
      {/* 総件数は出さない。「探す」は章・記録・観測まで1件ずつ数えるので、入れ物を数えた
          合計を並べると2画面で違う総数が出て、どちらかが壊れて見える。数えるのは種類ごとだけ。 */}
      <AppBar title="一覧" back={false} subtitle="種類ごとに全部見る" />
      <Page>
        <VStack align="stretch" gap="6">

          {resume.items.length > 0 && (
            <Box>
              <Slot>{resume.reading ? '続きから' : 'まずはここから'}</Slot>
              <VStack align="stretch" gap="3">
                {resume.items.map((i) => (
                  <Card key={i.key} onClick={() => navigate(i.next.route)}>
                    <Text fontSize="11px" color={C.faint}>
                      {i.title}{i.next.routeLabel ? ` — ${i.next.routeLabel}` : ''}
                    </Text>
                    <Text fontSize="sm" color={C.ink} fontWeight="700" mt="1">
                      {i.done > 0 ? '次の章' : '第1章'}：{i.next.title}
                    </Text>
                    {i.next.gist && (
                      <Text fontSize="xs" color={C.muted} mt="1" lineHeight="1.7"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {i.next.gist}
                      </Text>
                    )}
                    <Flex align="center" gap="2.5" mt="3">
                      <Box flex="1" h="5px" borderRadius="full" bg="rgba(255,255,255,.08)" overflow="hidden">
                        <Box h="100%" borderRadius="full" bg={ACCENT_GRADIENT}
                          style={{ width: `${Math.round((i.progress || 0) * 100)}%` }} />
                      </Box>
                      <Text fontSize="11px" color={C.faint} flexShrink="0">読了 {i.done}/{i.total}</Text>
                    </Flex>
                  </Card>
                ))}
              </VStack>
            </Box>
          )}

          <Box>
            <Slot>種類</Slot>
            <VStack align="stretch" gap="3">
              {groups.map((g) => {
                const color = GROUP_COLOR[g.id] || C.sky;
                const recent = g.items[0];
                return (
                  <Card key={g.id} onClick={() => navigate(`/groups/${g.id}`)}>
                    <HStack justify="space-between" align="baseline" gap="3">
                      <HStack gap="2.5" align="baseline">
                        <Text fontSize="md" fontWeight="700" color={C.ink}>{g.label}</Text>
                        <Text fontSize="sm" fontWeight="800" color={color}>{g.count}</Text>
                      </HStack>
                      <Text fontSize="sm" color={C.faint} flexShrink="0">›</Text>
                    </HStack>
                    <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">{g.lead}</Text>
                    {recent ? (
                      <Text fontSize="11px" color={C.faint} mt="2" lineHeight="1.6"
                        style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        最近：{recent.title}
                      </Text>
                    ) : (
                      <Text fontSize="11px" color={C.faint} mt="2">まだ1件もない</Text>
                    )}
                  </Card>
                );
              })}
            </VStack>
          </Box>

          <Card soft>
            <Text fontSize="sm" color={C.ink} fontWeight="600">目当てが決まっているとき</Text>
            <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">
              種類・テーマ・文字列で絞り込むなら「探す」から引く。
            </Text>
            <Box mt="3">
              <Button size="sm" borderRadius="12px" fontWeight="700" color={C.sky}
                bg="transparent" border="1px solid" borderColor={C.line}
                _hover={{ color: C.ink }} onClick={() => navigate('/search')}>探すへ ›</Button>
            </Box>
          </Card>

        </VStack>
      </Page>
    </>
  );
}

// ---------------- グループ1つの全件 ----------------
export function GroupList() {
  const navigate = useNavigate();
  const { site, reads } = useData();
  const { id } = useParams();
  const today = todayISO();
  const [limit, setLimit] = useState(PAGE);

  const groups = useMemo(() => buildGroups(site, reads), [site, reads]);
  const meta = groupById(id);
  const group = groups.find((g) => g.id === id);
  if (!meta || !group) return <NotFound what="この種類" />;

  const color = GROUP_COLOR[id] || C.sky;
  const shown = group.items.slice(0, limit);
  const rubric = site.writings?.rubric;

  return (
    <>
      <AppBar title={meta.label} subtitle={`${group.count}件 · ${meta.lead}`} />
      <Page>
        <VStack align="stretch" gap="5">

          {/* 作品だけは「どの軸で採点しているか」を先に出す。軸が固定されていることが仕組みの肝で、
              点だけ並べても何を測っているか分からない。 */}
          {id === 'piece' && rubric?.axes?.length > 0 && (
            <Card soft>
              <Text fontSize="sm" color={C.ink} fontWeight="700">毎回この5軸で採点する</Text>
              <VStack align="stretch" gap="1.5" mt="2">
                {rubric.axes.map((a) => (
                  <Text key={a.key} fontSize="xs" color={C.muted} lineHeight="1.7">
                    <b style={{ color: C.ink }}>{a.label}</b> — {a.desc}
                  </Text>
                ))}
              </VStack>
              <Text fontSize="11px" color={C.faint} mt="2.5" lineHeight="1.6">
                点は絶対評価ではなく、前回の自分との差分を見るためのもの。
              </Text>
            </Card>
          )}

          {group.count === 0 ? (
            <Card soft>
              <Text fontSize="sm" color={C.ink} fontWeight="600">まだ1件もない</Text>
              <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">{meta.lead}</Text>
              <Box mt="3"><CopyButton text={NEW_PROMPT[id]}>始める依頼をつくる</CopyButton></Box>
            </Card>
          ) : (
            <Box>
              <Slot count={group.count} action={
                <Button size="xs" variant="ghost" color={C.faint} px="1" flexShrink="0"
                  _hover={{ color: C.ink, bg: 'transparent' }}
                  onClick={() => navigate(`/search?type=${id}`)}>絞り込む ›</Button>
              }>
                {id === 'note' ? '新しい順' : '動いた順'}
              </Slot>
              <VStack align="stretch" gap="3">
                {shown.map((item) => (
                  <ItemCard key={item.key} item={item} color={color} today={today}
                    onOpen={(r) => navigate(r)} />
                ))}
              </VStack>
              {group.count > shown.length && (
                <Button mt="4" w="100%" size="sm" borderRadius="12px" fontWeight="700" color={C.muted}
                  bg="transparent" border="1px solid" borderColor={C.line}
                  _hover={{ color: C.ink }} onClick={() => setLimit(limit + PAGE)}>
                  もっと見る（あと {group.count - shown.length}件）
                </Button>
              )}
            </Box>
          )}

        </VStack>
      </Page>
    </>
  );
}
