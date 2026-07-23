import { createContext, useContext } from 'react';

// 復号済みサイトデータ（{ site, idx }）を配るコンテキスト。
export const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);
