import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// NOVA V12 CACHE PURGE ENGINE
const purgeOldVersions = async () => {
  try {
    // 1. Unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    
    // 2. Clear all named caches
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
    }

    // 3. Clear legacy state keys
    Object.keys(localStorage).forEach(key => {
      if (key.includes('gab_eats_v600') || key.includes('nebula') || key.includes('v1100')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log("Nova V12: Environment Purge Complete.");
  } catch (e) {
    console.warn("Purge interrupted, proceeding to mount.");
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element missing");
}

const mount = () => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <div className="page-transition">
        <App />
      </div>
    </React.StrictMode>
  );
};

// Initializing
purgeOldVersions().finally(mount);
