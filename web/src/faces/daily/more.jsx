// 「設定」タブ——アプリそのものの設定だけを置く場所。読みものも履歴もここに置かない。
//
// 経緯: このタブは `依頼`（できること／在庫の健康／未送信の依頼／画面のかたち）→
// `設定`（読み込み直す／画面のかたち／未送信の依頼／最近見たもの／再読の記録。2026-10-02）と変わり、
// 2026-10-17 に**設定に関係するものだけ**へ絞った（オーナーの指示:「閲覧履歴みたいなのはいらない」）。
//   - 最近見たもの・再読の記録 → 画面から外した（記録そのものは端末に残る。消したのは表示だけ）
//   - 未送信の依頼 → 判定が生まれる `今日` へ移した（サイトに溜まった依頼を渡す唯一の出口なので、消さずに移す）
import { useState } from 'react';
import { Box, Flex, VStack, Text, Button } from '@chakra-ui/react';
import { useShell } from '../../shell/ctx.js';
import { forceReload } from '../../shell/reload.js';
import { AppBar, Page, Card } from './ui.jsx';
import { C, tint } from '../../shared/theme.js';

export function More() {
  const { face, openSettings } = useShell();
  const [reloading, setReloading] = useState(false);

  return (
    <>
      <AppBar title="設定" back={false} />
      <Page>
        <VStack align="stretch" gap="3">
          {/* アプリレイアウトは3つある。どのレイアウトからも設定に戻れないと「試したら二度と戻せない」が
              起きるので、この面の非常口はここ（常に下のタブから1タップで来られる場所）に置く。 */}
          <Card onClick={openSettings}>
            <Flex align="center" justify="space-between" gap="3">
              <Box>
                <Text fontSize="sm" color={C.ink} fontWeight="700">アプリレイアウト</Text>
                <Text fontSize="xs" color={C.muted} mt="1" lineHeight="1.7">いまは「{face.label}」</Text>
              </Box>
              <Text fontSize="sm" color={C.faint} flexShrink="0">›</Text>
            </Flex>
          </Card>

          <Card>
            <Text fontSize="sm" color={C.ink} fontWeight="700">最新の版を読み込み直す</Text>
            <Text fontSize="xs" color={C.muted} mt="1" lineHeight="1.7">
              アプリを終了しなくても、いま配信されている版に入れ替わります。読み込み直したあとは、もう一度ロックを解除します。
            </Text>
            <Button mt="3" size="sm" w="100%" borderRadius="12px" fontWeight="700" color={C.sky}
              bg={tint(C.sky, 14)} border="1px solid" borderColor={tint(C.sky, 34)}
              _hover={{ bg: tint(C.sky, 22) }} disabled={reloading}
              onClick={() => { setReloading(true); forceReload(); }}>
              {reloading ? '読み込み中…' : '↻ 読み込み直す'}
            </Button>
          </Card>
        </VStack>
      </Page>
    </>
  );
}
