import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { lockBrowserInteractions } from './utils/lockBrowserInteractions';

if (import.meta.env.PROD) {
  lockBrowserInteractions();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
