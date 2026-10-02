// 「一覧」——増えていく入れ物（Series / Logbook / Tracker / Writing）の全件を、更新順に並べる画面。
//
// この画面が答えるのは1問だけ:「どんな入れ物があって、最近動いたのはどれか」。
// 既定は**全種類を混ぜた更新順**で、上のタブで種類を切り替える。切り替えはページ遷移ではなく
// リストの中身の差し替え（URL の `?kind=` を置き換えるだけ）——種類を行き来するたびに
// 戻るボタンの履歴が積もると、詳細から戻ってきたときに一覧の外へ出るまで何度も戻らされる。
//
// 以前ここには「続きから」と「目当てが決まっているとき（探すへの案内）」のカードもあったが、
// 前者は今日の紙面と、後者は下のタブと重複していて、リストを押し下げるだけだった（2026-10-02 に削除）。
// 記事は一覧から外した。記事の網羅は `探す` の既定（全件の作成順）が持つ（web/DESIGN.md 原則19）。
import { useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, Text, Button } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { AppBar, Page, Slot, Card, Chip, CopyButton, relDay } from './ui.jsx';
import { buildGroups, groupById } from '../../lib/groups.js';
import { todayISO } from '../../lib/recall.js';
import { C, ACCENT_GRADIENT, tint } from '../../shared/theme.js';

const GROUP_COLOR = {
  atlas: C.violet, logtopic: C.green, follow: C.amber, piece: C.pink,
};

// 1回に描く件数。今はどの種類も数十件に収まるが、全部混ぜると伸び続けるので「もっと見る」で伸ばす。
const PAGE = 50;

const NEW_PROMPT = {
  atlas: '/mn-learn 〜について学びたいので、学習アトラス（知識グラフ＋読む順路）を作って。',
  logtopic: '/mn-log 〜を記録したい。記録項目（スキーマ）を設計して。',
  follow: '/mn-follow 〜を定点観測したい。トラックを作って。',
  piece: '/mn-write お題をちょうだい。',
};

function Bar({ pct }) {
  return (
    <Box mt="2.5" h="5px" borderRadius="full" bg="rgba(255,255,255,.08)" overflow="hidden">
      <Box h="100%" borderRadius="full" bg={ACCENT_GRADIENT} style={{ width: `${pct}%` }} />
    </Box>
  );
}

function ItemCard({ item, kindLabel, color, today, onOpen }) {
  return (
    <Card onClick={() => onOpen(item.route)}>
      {kindLabel && (
        <Text fontSize="10px" fontWeight="700" letterSpacing="0.08em" color={color} mb="1">{kindLabel}</Text>
      )}
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

// 種類のタブ。横に並べて、狭い端末では横スクロールに逃がす（折り返すと高さが揺れる）。
function KindTabs({ tabs, value, onChange }) {
  return (
    <Flex gap="1.5" mt="3" overflowX="auto" style={{ scrollbarWidth: 'none' }}>
      {tabs.map((t) => {
        const on = t.id === value;
        const color = t.color || C.sky;
        return (
          <Box as="button" key={t.id} onClick={() => onChange(t.id)} flexShrink="0"
            px="2.5" py="1.5" borderRadius="full" fontSize="xs" fontWeight={on ? '700' : '600'}
            whiteSpace="nowrap" aria-pressed={on}
            color={on ? C.ink : C.muted}
            bg={on ? tint(color, 22) : 'transparent'}
            border="1px solid" borderColor={on ? tint(color, 45) : C.line}>
            {t.label}
            <Box as="span" ml="1.5" color={on ? color : C.faint} fontWeight="700">{t.count}</Box>
          </Box>
        );
      })}
    </Flex>
  );
}

export function Groups() {
  const navigate = useNavigate();
  const { site, reads } = useData();
  const today = todayISO();
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(PAGE);

  const groups = useMemo(() => buildGroups(site, reads), [site, reads]);
  const all = useMemo(() => groups
    .flatMap((g) => g.items.map((item) => ({ ...item, kind: g.id })))
    // 全種類を混ぜても並びの軸は1本（最終更新）。同着はタイトルで決める（原則10）
    .sort((a, b) => ((a.date || '') === (b.date || '')
      ? a.title.localeCompare(b.title, 'ja')
      : (b.date || '').localeCompare(a.date || ''))), [groups]);

  const kind = groupById(params.get('kind')) ? params.get('kind') : 'all';
  const group = groups.find((g) => g.id === kind);
  const list = group ? group.items.map((item) => ({ ...item, kind })) : all;
  const shown = list.slice(0, limit);
  const rubric = site.writings?.rubric;

  const tabs = [
    { id: 'all', label: 'All', count: all.length },
    ...groups.map((g) => ({ id: g.id, label: g.label, count: g.count, color: GROUP_COLOR[g.id] })),
  ];
  const pick = (id) => {
    setLimit(PAGE);
    setParams(id === 'all' ? {} : { kind: id }, { replace: true });
    window.scrollTo(0, 0);
  };

  return (
    <>
      <AppBar title="一覧" back={false}>
        <KindTabs tabs={tabs} value={kind} onChange={pick} />
      </AppBar>
      <Page>
        <VStack align="stretch" gap="5">

          {/* 作品だけは「どの軸で採点しているか」を先に出す。軸が固定されていることが仕組みの肝で、
              点だけ並べても何を測っているか分からない。 */}
          {kind === 'piece' && rubric?.axes?.length > 0 && (
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

          {list.length === 0 ? (
            <Card soft>
              <Text fontSize="sm" color={C.ink} fontWeight="600">まだ1件もない</Text>
              {group && (
                <>
                  <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">{group.lead}</Text>
                  <Box mt="3"><CopyButton text={NEW_PROMPT[kind]}>始める依頼をつくる</CopyButton></Box>
                </>
              )}
            </Card>
          ) : (
            <Box>
              <Slot count={list.length}>更新順</Slot>
              <VStack align="stretch" gap="3">
                {shown.map((item) => (
                  <ItemCard key={item.key} item={item} today={today}
                    color={GROUP_COLOR[item.kind] || C.sky}
                    kindLabel={group ? null : groupById(item.kind)?.label}
                    onOpen={(r) => navigate(r)} />
                ))}
              </VStack>
              {list.length > shown.length && (
                <Button mt="4" w="100%" size="sm" borderRadius="12px" fontWeight="700" color={C.muted}
                  bg="transparent" border="1px solid" borderColor={C.line}
                  _hover={{ color: C.ink }} onClick={() => setLimit(limit + PAGE)}>
                  もっと見る（あと {list.length - shown.length}件）
                </Button>
              )}
            </Box>
          )}

        </VStack>
      </Page>
    </>
  );
}
