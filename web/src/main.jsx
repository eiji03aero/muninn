import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// UI ライブラリ（Chakra）の Provider はここには置かない。日報の持ち物として
// faces/daily の中で立てる——面Aと面Bは Chakra を使わないので、
// 日報を落とす日が来たら依存ごと消せる状態を保つ。
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
