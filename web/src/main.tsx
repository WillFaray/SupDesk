import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';

import { AuthProvider } from './lib/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { App } from './App';

import './styles/tokens.css';
import './styles/base.css';
import './styles/chrome.css';
import './styles/components.css';
import './styles/queue.css';
import './styles/users.css';
import './styles/board.css';
import './styles/login.css';
import './styles/forms.css';
import './styles/detail.css';
import './styles/loading.css';
import './styles/toast.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
