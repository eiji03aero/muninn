// 面「一本の欄」の土台（stub）。
//
// この面の本体（欄に打つと面そのものが切り替わる挙動）はまだ作っていない。ここで固めるのは
// thumb と同じく「切り替え基盤に載るための最低限の形」——ディープリンクを無視しない、
// 脱出口を必ず残す、CSSスコープを漏らさない、の3つだけ。
//
// 「一本の欄」という思想を先取りして、脱出口じたいを欄の見た目にしておく。本物の入力欄では
// なく <button> なので、打鍵は一切拾わない（動く入力欄はこの stub の範囲外）。
import { useEffect, useState } from 'react';
import { useShell } from '../../shell/ctx.js';
import { useData } from '../../lib/ctx.js';
import { Md } from '../../shared/Md.jsx';
import './field.css';

export default function FieldRoot({ initialTarget }) {
  const { openSettings } = useShell();
  const { graph } = useData();

  // 親指ひとつと同じ理由（PWA に戻るが無い）で、閉じたかどうかだけ面内 state で持つ。
  // 対象そのものは shell から降ってくる値を正とする（面内に古い値を抱えて勝たせない）。
  const [closed, setClosed] = useState(false);
  useEffect(() => { setClosed(false); }, [initialTarget?.route]);
  const target = closed ? null : initialTarget;
  const node = target ? graph?.byRoute?.get(target.route) : null;

  return (
    <div className="face-field" data-face="field">
      <div className="field-body">
        {target ? (
          <div className="field-target">
            <button type="button" className="field-back" onClick={() => setClosed(true)}>
              1つ前に戻る
            </button>
            {node ? (
              <>
                <h1 className="field-title">{node.title}</h1>
                <Md text={node.body} />
              </>
            ) : (
              <p className="field-missing">この対象は見つからない。</p>
            )}
          </div>
        ) : (
          <div className="field-home">
            <p className="field-eyebrow">一本の欄</p>
            <p className="field-lead">下の欄に打つと面が変わる。タブは無い。</p>
            <p className="field-note">この面はまだ作られていない。</p>
          </div>
        )}
      </div>

      {/* 「一本の欄」の見せかけ。押すと開くのは入力ではなく設定（唯一の脱出口）。 */}
      <div className="field-dock">
        <button type="button" className="field-bar" onClick={openSettings}>
          面のかたちを選ぶ
        </button>
      </div>
    </div>
  );
}
