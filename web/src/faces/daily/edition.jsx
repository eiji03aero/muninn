// 「今日」——日報の入口。2026-10-17 に紙面（リード・袖・特集・記録・在庫の段組み）から作り直した。
//
// 毎朝ここでやることは2つしかない: **再読を数枚こなす** と **読みかけの続きに戻る**。
// 以前の紙面は「並べられるものを全部並べた」結果、1画面に7種類のカードが積まれ、
// オーナーに「ごちゃごちゃ色々並びすぎ」と言われた。並べる段を2つに絞り、1画面に収める。
// 再読は1枚ずつ重ねて出す——3枚を縦に並べると、めくる前から「残り」が壁になる。
import { useMemo, useState } from 'react';
import { Box, Flex, HStack, Heading, Text, Button, Textarea } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { Page, Card, Chip, CopyButton, Md } from './ui.jsx';
import { composeToday } from '../../lib/edition.js';
import {
  recordVerdict, loadPending, loadSlips, clearPending, clearSlips, slipsPrompt, todayISO, doneThisWeek,
} from '../../lib/recall.js';
import { cleanTitle, shortTitle, tagLabel } from '../../lib/graph.js';
import { C, ACCENT_GRADIENT } from '../../shared/theme.js';

const WEEKDAY = '日月火水木金土';

function Masthead({ today }) {
  const d = new Date(`${today}T00:00:00`);
  return (
    <Flex as="header" align="baseline" justify="space-between" gap="3" px="4" pb="1"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <Heading as="h1" size="lg" color={C.ink} letterSpacing="0.34em" fontWeight="600" lineHeight="1">muninn</Heading>
      <Text fontSize="11px" color={C.muted} flexShrink="0">
        {d.getMonth() + 1}月{d.getDate()}日（{WEEKDAY[d.getDay()]}）
      </Text>
    </Flex>
  );
}

function SectionTitle({ children }) {
  return (
    <Heading as="h2" fontSize="13px" fontWeight="700" letterSpacing="0.08em" color={C.muted} lineHeight="1.4">
      {children}
    </Heading>
  );
}

// ---------------- 再読（1枚ずつめくる束） ----------------
// クイズUIではなく読み物として出す。muninn のタイトルは言い切り形＝答えそのものなので、
// タイトルを伏せて recall の問いだけを見せる（web/DESIGN.md §6）。
function RecallStack({ queue }) {
  const navigate = useNavigate();
  const { shadow, refresh } = useData();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const [last, setLast] = useState(null);
  const total = queue.length;
  const week = doneThisWeek();

  if (!total) {
    return (
      <Box as="section" aria-label="今日の再読">
        <SectionTitle>今日の再読</SectionTitle>
        <Box mt="2.5"><Card soft><Text fontSize="sm" color={C.muted}>今日は期日が来た記事がない</Text></Card></Box>
      </Box>
    );
  }

  const finished = i >= total;
  const note = finished ? null : queue[i].note;
  const behind = finished ? 0 : total - i - 1;

  // 一言を書いたかで q を分ける（書いて わかった=5 / 書かず=4 / あやしい=2）。§6 の自己申告の補正。
  const judge = (ok) => {
    const r = recordVerdict(note, ok, memo.trim().length > 0, shadow);
    setLast({ ok, next: r.next });
    setI(i + 1);
    setFlipped(false);
    setMemo('');
    setMemoOpen(false);
    refresh?.();
  };

  return (
    <Box as="section" aria-label="今日の再読">
      <Flex align="center" justify="space-between" mb="2.5">
        <SectionTitle>今日の再読</SectionTitle>
        <HStack gap="1.5">
          {queue.map((q, k) => (
            <Box key={q.note.slug} w="6px" h="6px" borderRadius="full"
              bg={k < i ? C.green : k === i ? C.ink : 'rgba(255,255,255,.16)'} />
          ))}
          <Text fontSize="11px" color={C.faint} ml="1">{Math.min(i + 1, total)} / {total}</Text>
        </HStack>
      </Flex>

      {finished ? (
        <Box className="glass-soft" px="5" py="6" textAlign="center">
          <Text fontSize="15px" fontWeight="700" color={C.ink}>今日の再読はおしまい</Text>
          <Text fontSize="xs" color={C.muted} mt="1.5">明日また、期日が来た記事から出します</Text>
        </Box>
      ) : (
        <Box position="relative" pb={behind > 0 ? '4' : '0'}>
          {behind > 1 && (
            <Box className="glass" position="absolute" left="4" right="4" bottom="0" h="40px" opacity="0.35" aria-hidden="true" />
          )}
          {behind > 0 && (
            <Box className="glass" position="absolute" left="2" right="2" bottom="2" h="40px" opacity="0.6" aria-hidden="true" />
          )}
          <Box className="glass" position="relative" p="5" minH="300px" display="flex" flexDirection="column"
            style={{ background: 'linear-gradient(160deg,rgba(30,34,56,.97),rgba(18,20,36,.97))' }}>
            <Flex wrap="wrap" gap="1.5">
              {(note.tags || []).slice(0, 2).map((t) => <Chip key={t} color={C.sky}>{tagLabel(t)}</Chip>)}
            </Flex>

            {!flipped ? (
              <>
                <Box flex="1" mt="4">
                  {note.recall ? (
                    <Text fontSize="17px" color={C.ink} lineHeight="1.8">{note.recall}</Text>
                  ) : (
                    // recall 未設定のフォールバック。劣化するが壊れない。
                    <>
                      <Text fontSize="xs" color={C.faint} mb="1.5">{note.created} に書いた記事</Text>
                      <Text fontSize="17px" color={C.ink} lineHeight="1.8">これ、何の話だったか？</Text>
                    </>
                  )}
                </Box>
                <Button mt="5" w="100%" h="48px" borderRadius="14px" fontSize="15px" fontWeight="700"
                  color={C.ink} bg="transparent" border="1px solid" borderColor="rgba(255,255,255,.18)"
                  _hover={{ bg: 'rgba(255,255,255,.06)' }} onClick={() => setFlipped(true)}>
                  めくる
                </Button>
              </>
            ) : (
              <>
                <Heading as="h3" fontSize="15px" color={C.ink} lineHeight="1.6" mt="4">{note.title}</Heading>
                <Box flex="1" maxH="240px" overflowY="auto" mt="1" pr="1"><Md text={note.body} /></Box>
                {memoOpen ? (
                  <Textarea mt="3" value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} fontSize="13px"
                    aria-label="思い出せる範囲で一言"
                    placeholder="自分の言葉で書くと、わかった＝q5 として記録する"
                    color={C.ink} bg="rgba(255,255,255,.04)" border="1px solid" borderColor={C.line}
                    borderRadius="12px" _placeholder={{ color: C.faint, fontSize: '11px' }}
                    _focus={{ borderColor: C.sky, outline: 'none' }} />
                ) : (
                  <Button mt="2" size="xs" variant="ghost" color={C.faint} alignSelf="flex-start" px="1"
                    _hover={{ color: C.ink, bg: 'transparent' }} onClick={() => setMemoOpen(true)}>
                    ＋ 一言書く（任意）
                  </Button>
                )}
                <HStack gap="2" mt="3">
                  <Button flex="1" h="48px" borderRadius="14px" fontSize="15px" fontWeight="700" color="#08111f"
                    bg={ACCENT_GRADIENT} _hover={{ opacity: 0.92 }} onClick={() => judge(true)}>
                    わかった
                  </Button>
                  <Button flex="1" h="48px" borderRadius="14px" fontSize="15px" fontWeight="600" color={C.muted}
                    bg="transparent" border="1px solid" borderColor="rgba(255,255,255,.18)"
                    _hover={{ color: C.ink }} onClick={() => judge(false)}>
                    あやしい
                  </Button>
                </HStack>
                <Button mt="2" size="xs" variant="ghost" color={C.faint} w="100%"
                  _hover={{ color: C.ink, bg: 'transparent' }} onClick={() => navigate(`/note/${note.slug}`)}>
                  記事を開く ›
                </Button>
              </>
            )}
          </Box>
        </Box>
      )}

      <Flex mt="2.5" gap="3" wrap="wrap">
        {last && (
          <Text fontSize="11px" color={last.ok ? C.green : C.amber}>
            {last.ok ? '✓ わかった' : '△ あやしい'} · 次は {last.next}
          </Text>
        )}
        {week > 0 && <Text fontSize="11px" color={C.green}>今週 {week}件 再読した</Text>}
      </Flex>
    </Box>
  );
}

// ---------------- 続きから ----------------
function contRow(c) {
  if (c.type === 'chapter') {
    return {
      key: `ch:${c.atlas.slug}`,
      kicker: `次の章 · ${cleanTitle(c.atlas.title)}（${c.readCount}/${c.total} 読了）`,
      title: shortTitle(c.concept.title),
      to: `/atlas/${c.atlas.slug}/concept/${c.concept.slug}?route=${c.route.id}`,
    };
  }
  if (c.type === 'fresh') return { key: `n:${c.note.slug}`, kicker: '新着の記事', title: c.note.title, to: `/note/${c.note.slug}` };
  return { key: `n:${c.note.slug}`, kicker: `${c.ago}日ぶりの記事`, title: c.note.title, to: `/note/${c.note.slug}` };
}

function ContinueList({ items }) {
  const navigate = useNavigate();
  if (!items.length) return null;
  return (
    <Box as="section" aria-label="続きから">
      <Box mb="1.5"><SectionTitle>続きから</SectionTitle></Box>
      <Box className="glass-soft" px="4">
        {items.map(contRow).map((r, k) => (
          <Flex as="button" key={r.key} w="100%" textAlign="left" className="press" align="center" gap="3" py="3.5"
            borderTop={k ? `1px solid ${C.line}` : 'none'} onClick={() => navigate(r.to)}>
            <Box flex="1" minW="0">
              <Text fontSize="11px" color={C.faint}>{r.kicker}</Text>
              <Text fontSize="sm" color={C.ink} fontWeight="600" lineHeight="1.5" mt="0.5" truncate>{r.title}</Text>
            </Box>
            <Text fontSize="md" color={C.faint} flexShrink="0">›</Text>
          </Flex>
        ))}
      </Box>
    </Box>
  );
}

// ---------------- Claude に渡す依頼 ----------------
// サイトは書き込めないので、再読の判定や深掘りの依頼は端末に溜まる。その出口。
// 判定が生まれるのはこの画面なので、出口もここに置く（2026-10-17 に `設定` から移した）。
// 溜まっていないときは出さない。件数は「未消化の借金」ではなく「渡せば消える荷物」なので出してよい。
const SLIP_KIND = { deepdive: '深掘り' };

function PendingRow() {
  const { refresh } = useData();
  const [, setTick] = useState(0);
  const pending = loadPending();
  const slips = loadSlips();
  const total = pending.length + slips.length;
  if (!total) return null;

  const counts = {};
  for (const s of slips) {
    const k = SLIP_KIND[s.kind] || '依頼';
    counts[k] = (counts[k] || 0) + 1;
  }
  const parts = [
    ...(pending.length ? [`再読の判定 ${pending.length}`] : []),
    ...Object.entries(counts).map(([k, n]) => `${k} ${n}`),
  ];

  return (
    <Box as="section" aria-label="Claude に渡す依頼">
      <Flex className="glass-soft" align="center" gap="3" pl="4" pr="3" py="2.5">
        <Box flex="1" minW="0">
          <Text fontSize="13px" color={C.ink} fontWeight="600">
            Claude に渡す依頼 <Box as="span" color={C.amber}>{total}件</Box>
          </Text>
          <Text fontSize="11px" color={C.faint} mt="0.5">{parts.join('・')}</Text>
        </Box>
        <CopyButton text={slipsPrompt(slips, pending)}>コピー</CopyButton>
      </Flex>
      <Flex justify="flex-end">
        <Button size="xs" variant="ghost" color={C.faint} px="1" mt="1"
          _hover={{ color: C.ink, bg: 'transparent' }}
          onClick={() => { clearPending(); clearSlips(); setTick((t) => t + 1); refresh?.(); }}>
          渡し終わったので消す
        </Button>
      </Flex>
    </Box>
  );
}

// ---------------- 今日 ----------------
export function Edition() {
  const { site, graph, shadow, reads } = useData();
  const today = todayISO();
  // 再読の3枚は開いた時点で固定する。判定のたびに組み直すと、判定した札の代わりに
  // 次の期日の札が繰り上がってきて「今日の3枚」が終わらなくなる。
  const [queue] = useState(() => composeToday({ site, graph, shadow, reads, today }).recall);
  const cont = useMemo(
    () => composeToday({ site, graph, shadow, reads, today }).cont,
    [site, graph, shadow, reads, today],
  );

  return (
    <>
      <Masthead today={today} />
      <Page>
        <Flex direction="column" gap="7" pt="2">
          <RecallStack queue={queue} />
          <ContinueList items={cont} />
          <PendingRow />
        </Flex>
      </Page>
    </>
  );
}
