import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("No se pudo registrar el service worker:", error);
    });
  });
}

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const wasControlled = Boolean(navigator.serviceWorker.controller);
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => caches.keys())
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("genesis-app-"))
          .map((key) => caches.delete(key))
      ))
      .then(() => {
        if (wasControlled) window.location.reload();
      })
      .catch((error: unknown) => {
        console.error("No se pudo limpiar el service worker de desarrollo:", error);
      });
  });
}
