import { createContext, useContext } from 'react';

// 面（faces/*）が shell に頼めることを配るコンテキスト。
//
//   face          いま選ばれている面の定義 { id, label, hint }
//   openSettings  設定画面を開く（どの面からも脱出できる非常口。受け入れ条件5）
//   initialTarget ディープリンクで指定された対象（{ route, kind, slug } / 無ければ null）
//
// ここに置いてよいのは「どの面でも同じ意味を持つ操作」だけ。
// 面の中の移動（ページ遷移・スワイプ・欄の入力）は各面の自由で、shell は関知しない。
export const ShellCtx = createContext(null);
export const useShell = () => useContext(ShellCtx);
