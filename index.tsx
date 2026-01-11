import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Cleanup Legacy Gun.js keys that trigger "eval" connection attempts
try {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('gun/') || key.includes('gab_eats_v600') || key.includes('nebula')) {
      localStorage.removeItem(key);
    }
  });
} catch (e) {
  console.warn("Cleanup failed, proceeding anyway.");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

(window as any).deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e: any) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
  window.dispatchEvent(new Event('pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  (window as any).deferredPrompt = null;
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <div className="page-transition">
      <App />
    </div>
  </React.StrictMode>
);
