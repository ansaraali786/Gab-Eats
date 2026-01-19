import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const initializePlatform = async () => {
  try {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      if (!name.includes('v1300')) {
        await caches.delete(name);
      }
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // Use root path explicitly to avoid issues with nested routes
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Gab Eats Core: Service Worker Online', reg.scope))
          .catch(err => {
            // Log warning but don't block app initialization
            console.warn('Service Worker registration skipped/failed:', err);
          });
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

initializePlatform().finally(mount);
