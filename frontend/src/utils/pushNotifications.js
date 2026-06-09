import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { toast } from 'react-toastify';
import { registerPushToken, unregisterPushToken } from './api';
import api from './api';
import { getStoredAuthUserId } from './authSession';

const TOKEN_STORAGE_KEY = 'fcm_token';
let foregroundUnsubscribe = null;

export const isIosDevice = () => {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator?.userAgent || '');
};

export const isRunningInstalledApp = () => {
  if (typeof window === 'undefined') return false;
  const isStandaloneMode = window.matchMedia?.('(display-mode: standalone)').matches;
  const isIosStandalone = window.navigator?.standalone === true;
  return Boolean(isStandaloneMode || isIosStandalone);
};

export const isPushEnvironmentSupported = async () => {
  if (
    typeof window === 'undefined' ||
    !window.isSecureContext ||
    !('serviceWorker' in navigator) ||
    !('Notification' in window)
  ) {
    return false;
  }

  return isSupported();
};

export const getNotificationPermissionState = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
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

const getStoredTokenRecord = () => {
  const storedValue = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!storedValue) return { token: null, userId: null };

  try {
    const parsedValue = JSON.parse(storedValue);
    if (parsedValue?.token) {
      return {
        token: parsedValue.token,
        userId: parsedValue.userId ? String(parsedValue.userId) : null,
      };
    }
  } catch {
    return { token: storedValue, userId: null };
  }

  return { token: storedValue, userId: null };
};

const setStoredToken = (token, userId = getStoredAuthUserId()) => {
  if (token) {
    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({
        token,
        userId: userId ? String(userId) : null,
      })
    );
    return;
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const enablePushNotifications = async ({ requestPermission = true, userId = null } = {}) => {
  if (!(await isPushEnvironmentSupported())) {
    return;
  }
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
  console.log('Push: serviceWorker ready', registration);
  try {
    await api.post('/firebase/diagnostic', { event: 'serviceWorkerReady', message: 'service worker ready' });
  } catch (_) {}

  const messaging = getMessaging(app);
  let token;
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    console.log('Push: getToken result', token);
    await api.post('/firebase/diagnostic', { event: 'getTokenSuccess', token: token || null });
  } catch (err) {
    console.error('Push: getToken failed', err);
    try { await api.post('/firebase/diagnostic', { event: 'getTokenError', message: err?.message || String(err) }); } catch (_) {}
    return;
  }

  if (!token) {
    try { await api.post('/firebase/diagnostic', { event: 'getTokenEmpty' }); } catch (_) {}
    return;
  }

  const currentStoredToken = getStoredTokenRecord();
  const currentUserId = userId ? String(userId) : getStoredAuthUserId();
  const tokenChanged =
    currentStoredToken.token !== token || currentStoredToken.userId !== currentUserId;

  try {
    await registerPushToken(token);
    setStoredToken(token, currentUserId);
    console.log(`Push: registerPushToken succeeded (${tokenChanged ? 'changed' : 'refreshed'})`);
    try {
      await api.post('/firebase/diagnostic', {
        event: tokenChanged ? 'registerPushTokenSuccess' : 'registerPushTokenRefresh',
        token,
      });
    } catch (_) {}
  } catch (err) {
    console.error('Push: registerPushToken failed', err);
    try {
      await api.post('/firebase/diagnostic', {
        event: 'registerPushTokenError',
        message: err?.message || String(err),
        token,
      });
    } catch (_) {}
    return;
  }

  // Always clean up existing listener before setting up a new one
  if (foregroundUnsubscribe) {
    foregroundUnsubscribe();
  }
  
  foregroundUnsubscribe = onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'Notification';
    const body = payload.notification?.body || '';
    toast.info(body ? `${title}: ${body}` : title);
  });
};

export const disablePushNotifications = async () => {
  const token = getStoredTokenRecord().token;
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
