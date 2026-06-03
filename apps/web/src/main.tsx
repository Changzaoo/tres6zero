import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastContainer } from './components/ui/Toast';
import { API_URL } from './config/api';
import { initNetworkStatus } from './offline/networkStatus';
import { configureOfflineSync, startOfflineSyncLoop } from './offline/syncEngine';
import { registerServiceWorker } from './services/pwaService';
import { deviceHeaders, getAuthToken } from './services/authService';
import { applyThemeMode, startThemeWatcher } from './services/themeService';
import './styles/globals.css';

// Initialize Firebase auth listener
import './store/authStore';

applyThemeMode();
startThemeWatcher();
registerServiceWorker();
initNetworkStatus({ pingUrl: `${API_URL}/health` });
configureOfflineSync({
  baseUrl: API_URL,
  getHeaders: () => {
    const headers: Record<string, string> = { ...deviceHeaders() };
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },
});
startOfflineSyncLoop();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>
);
