import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import { initializeFirebase } from './utils/firebaseClient';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Clear any old PWA workers in local dev so config changes are applied immediately.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

// Initialize Firebase
initializeFirebase().then((initialized) => {
  if (initialized) {
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase initialization failed - app will continue with reduced features');
  }
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
