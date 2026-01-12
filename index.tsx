import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// NOVA V13 CACHE PURGE ENGINE
const performSystemPurge = async () => {
  try {
    // 1. Kill all Service Workers to stop loading old index.html
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }
    
    // 2. Wipe all browser caches
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      await caches.delete(name);
    }

    // 3. Clear legacy state keys to prevent layout conflicts
    const legacyKeys = ['gab_eats_v600', 'nebula', 'v1100', 'v900', 'zero_eval', 'v1200'];
    Object.keys(localStorage).forEach(key => {
      if (legacyKeys.some(k => key.includes(k))) {
        localStorage.removeItem(key);
      }
    });
    
    console.log("Nova V13: System Purge Complete.");
  } catch (e) {
    console.warn("Purge interrupted, mounting...");
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

// Start initialization
performSystemPurge().finally(mount);
