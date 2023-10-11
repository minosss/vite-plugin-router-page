import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.tsx';
import 'virtual:svg-icons-register?common';

ReactDOM.createRoot(document.querySelector('#root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
