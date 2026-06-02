import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastContainer } from './components/ui/Toast';
import { registerServiceWorker } from './services/pwaService';
import { applyThemeMode, startThemeWatcher } from './services/themeService';
import './styles/globals.css';

// Initialize Firebase auth listener
import './store/authStore';

applyThemeMode();
startThemeWatcher();
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>
);
