import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppWithLocale } from './app/AppWithLocale';
import './i18n';
import './index.css';

// Remove any lingering Google Translate cookie from previous sessions
// so it can't inject DOM-level translation on load.
document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithLocale />
  </StrictMode>
);
