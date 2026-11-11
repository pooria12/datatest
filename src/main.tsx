import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { applyTheme, getThemePreference } from '@lib/theme';
import './styles/globals.css';

// index.html already applied the theme before paint; this keeps it in sync after hydration.
applyTheme(getThemePreference());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);