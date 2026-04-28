import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { toast } from 'react-toastify';
import { registerPushToken, unregisterPushToken } from './api';

const TOKEN_STORAGE_KEY = 'fcm_token';
let foregroundUnsubscribe = null;

export const isRunningInstalledApp = () => {
  if (typeof window === 'undefined') return false;
  const isStandaloneMode = window.matchMedia?.('(display-mode: standalone)').matches;
  const isIosStandalone = window.navigator?.standalone === true;
  return Boolean(isStandaloneMode || isIosStandalone);
};

const getFirebaseConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const hasFirebaseConfig = () => {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId
  );
};

const ensureFirebaseApp = () => {
  if (!hasFirebaseConfig()) return null;
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(getFirebaseConfig());
};

const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return;
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const enablePushNotifications = async ({ requestPermission = true } = {}) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return;
  }

  if (!(await isSupported())) return;
  const app = ensureFirebaseApp();
  if (!app) return;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return;

  let permission = Notification.permission;
  if (permission !== 'granted') {
    if (!requestPermission) return;
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return;

  const currentStoredToken = getStoredToken();
  if (currentStoredToken !== token) {
    await registerPushToken(token);
    setStoredToken(token);
  }

  if (!foregroundUnsubscribe) {
    foregroundUnsubscribe = onMessage(messaging, (payload) => {
      const title = payload.notification?.title || 'Notification';
      const body = payload.notification?.body || '';
      toast.info(body ? `${title}: ${body}` : title);
    });
  }
};

export const disablePushNotifications = async () => {
  const token = getStoredToken();
  if (!token) {
    if (foregroundUnsubscribe) {
      foregroundUnsubscribe();
      foregroundUnsubscribe = null;
    }
    return;
  }

  await unregisterPushToken(token);
  setStoredToken(null);
  if (foregroundUnsubscribe) {
    foregroundUnsubscribe();
    foregroundUnsubscribe = null;
  }
};
