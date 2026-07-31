import { useState } from 'react';
import { Box, Flex, HStack, VStack, Text, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useData } from './lib/ctx.js';
import { AppBar, Page, Slot, Card, CopyButton } from './ui.jsx';
import { loadPending, clearPending, loadSlips, clearSlips, slipsPrompt, reviewPrompt, effectiveSrs } from './lib/recall.js';
import { C, tint } from './theme.js';

// 「何ができるか」を説明するページと「それをやる」ページを同じにする。
// 説明だけのページは読まれない——見出しは concern 名ではなく目的語で立てる。
const CAN_DO = [
  {
    title: '覚える',
    desc: '調べた事実を1枚ずつに分けて貯め、期日が来たら面に出す',
    example: '/mn 〜について調べて、notes に記録して',
  },
  {
    title: '追う',
    desc: '1つの対象を同じ条件で観測して、前回と比べる',
    example: '/mn-follow 今日のスイングを見て記録して',
  },
  {
    title: '学ぶ',
    desc: 'トピックを知識グラフと読む順路で体系立てて学ぶ',
    example: '/mn-learn 〜のアトラスを作って',
  },
  {
    title: '比べる',
    desc: '同じ記録項目で多数を貯めて、並べて比べる',
    example: '/mn-log これを記録して',
  },
  {
    title: '思い出す',
    desc: '蓄積を横断して束ね、試合前などに予習する',
    example: '/mn-brief 〜の見どころをまとめて',
  },
];

export function Desk() {
  const navigate = useNavigate();
  const { site, graph, shadow, refresh } = useData();
  const [tick, setTick] = useState(0);
  const pending = loadPending();
  const slips = loadSlips();
  const total = pending.length + slips.length;

  // ---- 在庫の健康（すべて実データから機械的に数えられる値）----
  const noRecall = site.notes.filter((n) => n.kind === 'knowledge' && !n.recall);
  const noMetrics = site.follows
    .filter((f) => f.followType === 'goal')
    .flatMap((f) => f.sessions.filter((s) => !s.metrics).map((s) => ({ f, s })));
  const orphans = site.notes.filter((n) => (graph.backlinks.get(`/note/${n.slug}`)?.length || 0) === 0);
  const stubs = (site.atlases || []).flatMap((a) => a.concepts.filter((c) => c.status === 'stub').map((c) => ({ a, c })));

  const health = [
    {
      label: '想起の問いが無い記事', count: noRecall.length,
      prompt: `/mn muninn の notes のうち frontmatter に recall がない kind: knowledge のノート（${noRecall.length}件）に、想起用の問い \`recall:\` を1行ずつ足して。\n` +
        `問いの条件: ①答えを問いの中に含めない ②タイトルの言い換えにしない ③理由・関係・適用を問う。\n` +
        `本文は一切変更しないこと。frontmatter への追記のみ。まとめて1コミットで push して。`,
    },
    {
      label: '数値未記入の観測', count: noMetrics.length,
      prompt: `/mn-follow 以下の観測セッションの frontmatter に \`metrics:\` を足して（本文の計測値の表から数値を起こす）。本文は変更しないこと。\n` +
        noMetrics.map(({ f, s }) => `- follows/${f.name}/sessions/${s.date}.md`).join('\n'),
    },
    {
      label: 'どこからも辿れない記事', count: orphans.length,
      prompt: `/mn 以下のノートが muninn のどこからも辿れない（被リンク0）。内容を読んで、関連する既存ノート・MOC から [[リンク]] を張って繋ぎ直して。リンクには理由を一言添えること。確信のない連想リンクは張らないこと。\n` +
        orphans.map((n) => `- ${n.slug}`).join('\n'),
    },
    {
      label: '未執筆の章', count: stubs.length,
      prompt: `/mn-learn 以下の概念がまだ stub のまま。読み物として執筆して、覚える価値のある知識は notes/ に蒸留して相互リンクして。\n` +
        stubs.map(({ a, c }) => `- atlas/${a.slug}/concepts/${c.slug}.md（${c.gist}）`).join('\n'),
    },
  ].filter((h) => h.count > 0);

  const allPrompt = slipsPrompt(slips, pending);

  return (
    <>
      <AppBar title="デスク" back={false} subtitle="投げると、こうなる" />
      <Page>
        <VStack align="stretch" gap="6">

          {total > 0 && (
            <Box>
              <Slot count={`${total}件`}>未送信の伝票</Slot>
              <Card>
                <VStack align="stretch" gap="2">
                  {pending.length > 0 && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color={C.ink}>答え合わせ（再読の結果）</Text>
                      <Text fontSize="xs" color={C.faint}>{pending.length}件</Text>
                    </HStack>
                  )}
                  {slips.map((s) => (
                    <HStack key={s.id} justify="space-between" gap="2">
                      <Text fontSize="sm" color={C.ink} lineHeight="1.5">{s.label}</Text>
                      <Text fontSize="xs" color={C.faint} flexShrink="0">{s.date}</Text>
                    </HStack>
                  ))}
                </VStack>
                <HStack gap="2" mt="4">
                  <CopyButton text={allPrompt} w="100%">ぜんぶコピー</CopyButton>
                </HStack>
                <Button mt="2" size="xs" variant="ghost" color={C.faint} w="100%"
                  _hover={{ color: C.ink, bg: 'transparent' }}
                  onClick={() => { clearPending(); clearSlips(); setTick(tick + 1); refresh?.(); }}>
                  渡し終わったので消す
                </Button>
              </Card>

              {/* 自己申告の甘さが積もる前に、skill 側の厳しい採点と突き合わせる機会を作る */}
              {pending.length >= 20 && (
                <Box mt="3" className="glass-soft" p="4" borderRadius="14px"
                  border="1px solid" borderColor={tint(C.amber, 40)}>
                  <Text fontSize="11px" fontWeight="800" letterSpacing="0.1em" color={C.amber} mb="1.5">
                    校正チェックポイント
                  </Text>
                  <Text fontSize="sm" color={C.ink} lineHeight="1.7">
                    サイトの自己判定が {pending.length} 件たまった。本気の1問だけ <b>/mn-review</b> で受けてみないか。
                  </Text>
                  <Text fontSize="xs" color={C.faint} mt="1.5" lineHeight="1.6">
                    サイトの2択は手軽なぶん甘く出る。たまに本式で採点して、ズレを確かめておく。
                  </Text>
                  <Box mt="3">
                    <CopyButton tone="amber"
                      text={'/mn-review 1問だけ本式で出題して。サイトの自己採点に頼りすぎているので、自由記述で厳しく採点してほしい。'}>
                      1問もらう
                    </CopyButton>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          <Box>
            <Slot>できること</Slot>
            <VStack align="stretch" gap="3">
              {CAN_DO.map((c) => (
                <Card key={c.title}>
                  <Text fontSize="sm" color={C.ink} fontWeight="700">{c.title}</Text>
                  <Text fontSize="xs" color={C.muted} mt="1" lineHeight="1.7">{c.desc}</Text>
                  <Box mt="3"><CopyButton text={c.example}>「{c.example.replace(/^\/\S+\s/, '')}」</CopyButton></Box>
                </Card>
              ))}
            </VStack>
          </Box>

          <Box>
            <Slot>在庫の健康</Slot>
            {health.length === 0 ? (
              <Card soft><Text fontSize="sm" color={C.muted}>在庫はきれいだ</Text></Card>
            ) : (
              <Card>
                <VStack align="stretch" gap="3.5">
                  {health.map((h) => (
                    <Flex key={h.label} align="center" justify="space-between" gap="3">
                      <Text fontSize="sm" color={C.ink} lineHeight="1.5">{h.label}</Text>
                      <HStack gap="2.5" flexShrink="0">
                        <Text fontSize="sm" fontWeight="800" color={C.ink}>{h.count}</Text>
                        <CopyButton text={h.prompt} size="xs">依頼</CopyButton>
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              </Card>
            )}
          </Box>

          <Box>
            <Slot>muninn の仕組み</Slot>
            <Card soft>
              <Text fontSize="xs" color={C.muted} lineHeight="1.9">
                正本はこのリポジトリの markdown。このサイトはそれを読むための派生ビルドで、
                書き込みは Claude Code 側でやる。だからここでできるのは
                <b style={{ color: C.ink }}>「Claude に渡す依頼を作って溜めること」</b>まで。
                溜めた伝票は上の「ぜんぶコピー」で1回にまとめて渡せる。
              </Text>
            </Card>
          </Box>

        </VStack>
      </Page>
    </>
  );
}
