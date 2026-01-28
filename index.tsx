import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const initializePlatform = async () => {
  try {
    // Clear old caches except the current version
    const version = 'v1300';
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      if (!name.includes(version)) {
        await caches.delete(name);
      }
    }

    if ('serviceWorker' in navigator) {
      // Register service worker from the root to ensure global scope
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('GAB EATS: Service Worker Active', reg.scope);
    }
  } catch (e) {
    console.warn("Init Sequence Bypassed:", e);
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element missing");

const mount = () => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

initializePlatform().finally(mount);
