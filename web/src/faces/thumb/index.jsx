// 面「親指ひとつ」の土台（stub）。
//
// この面自体の操作系（左下だけで完結する動線）はまだ作っていない。ここで固めるのは
// 「面の切り替え基盤に載るために最低限守るべき形」だけ——ディープリンクを無視しない、
// 脱出口（面のかたちを選ぶ）を必ず残す、CSSスコープを漏らさない、の3つ。
import { useEffect, useState } from 'react';
import { useShell } from '../../shell/ctx.js';
import { useData } from '../../lib/ctx.js';
import { Md } from '../../shared/Md.jsx';
import './thumb.css';

export default function ThumbRoot({ initialTarget }) {
  const { openSettings } = useShell();
  const { graph } = useData();

  // 「閉じた」は面内 state で持つ。iOS の PWA にはブラウザの「戻る」が無いため、
  // URL を動かさずこの state だけで「1つ前に戻る」を成立させる。
  // 対象そのものは shell から降ってくる値を正とする——閉じたあとに別のリンクを踏んで
  // 同じ面へ戻ってきたとき、面内に抱えた古い値が勝つと開かない。
  const [closed, setClosed] = useState(false);
  useEffect(() => { setClosed(false); }, [initialTarget?.route]);
  const target = closed ? null : initialTarget;
  const node = target ? graph?.byRoute?.get(target.route) : null;

  return (
    <div className="face-thumb" data-face="thumb">
      <div className="thumb-body">
        {target ? (
          <div className="thumb-target">
            <button type="button" className="thumb-back" onClick={() => setClosed(true)}>
              1つ前に戻る
            </button>
            {node ? (
              <>
                <h1 className="thumb-title">{node.title}</h1>
                <Md text={node.body} />
              </>
            ) : (
              <p className="thumb-missing">この対象は見つからない。</p>
            )}
          </div>
        ) : (
          <div className="thumb-home">
            <p className="thumb-eyebrow">親指ひとつ</p>
            <p className="thumb-lead">左下の一点だけで操作する。上は読むだけ。</p>
            <p className="thumb-note">この面はまだ作られていない。</p>
          </div>
        )}
      </div>

      {/* 唯一の脱出口。左下起点の面という思想に合わせて、常にここに固定する。 */}
      <div className="thumb-dock">
        <button type="button" className="thumb-exit" onClick={openSettings}>
          面のかたちを選ぶ
        </button>
      </div>
    </div>
  );
}
