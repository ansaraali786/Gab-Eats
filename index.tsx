
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global variable to store the install prompt event
// Fix: Use any cast to access non-standard property on window
(window as any).deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e: any) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  // Fix: Use any cast to access non-standard property on window
  (window as any).deferredPrompt = e;
  console.log('PWA install prompt captured');
  
  // Dispatch a custom event to notify the UI
  window.dispatchEvent(new Event('pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  // Fix: Use any cast to access non-standard property on window
  (window as any).deferredPrompt = null;
  console.log('PWA was installed');
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <div className="page-transition">
      <App />
    </div>
  </React.StrictMode>
);
