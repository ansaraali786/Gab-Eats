import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// NOVA V13 CACHE PURGE ENGINE + PWA REGISTRATION
const initializePlatform = async () => {
  try {
    // 1. System Purge (Optional: only if version mismatch, but kept for Nova consistency)
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      // We only unregister if we want a hard reset. 
      // For one-click install to work, we need a stable registration.
      // await reg.unregister(); 
    }
    
    // 2. Wipe legacy browser caches
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      if (!name.includes('v1300')) {
        await caches.delete(name);
      }
    }

    // 3. Register GAB EATS Service Worker (CRITICAL for "One-Click" Install)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('Gab Eats Core: Service Worker Online', reg.scope))
          .catch(err => console.error('Gab Eats Core: Service Worker Offline', err));
      });
    }
    
    console.log("Nova V13: Initialization Sequence Complete.");
  } catch (e) {
    console.warn("Init interrupted, mounting...");
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

// Start initialization then mount
initializePlatform().finally(mount);
