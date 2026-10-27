import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator && window.location.protocol !== 'file:') {
  const rendererScript = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
  if (rendererScript) {
    const serviceWorkerUrl = new URL('../service-worker.js', rendererScript.src);
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(serviceWorkerUrl).catch((error: unknown) => {
        console.warn('Offline app shell could not be registered.', error);
      });
    });
  } else {
    console.warn('Offline app shell could not be registered because the renderer script URL is unavailable.');
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
