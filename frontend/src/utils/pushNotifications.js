import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { toast } from 'react-toastify';
import { registerPushToken, unregisterPushToken } from './api';

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

const getCurrentAuthUserId = () => {
  try {
    const rawAuthSession = localStorage.getItem('auth_session');
    if (!rawAuthSession) return null;
    const parsedAuthSession = JSON.parse(rawAuthSession);
    return parsedAuthSession?.user?.id ? String(parsedAuthSession.user.id) : null;
  } catch {
    return null;
  }
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

const getStoredToken = () => getStoredTokenRecord().token;

const setStoredToken = (token, userId = getCurrentAuthUserId()) => {
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
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return;

  const currentStoredToken = getStoredTokenRecord();
  const currentUserId = userId ? String(userId) : getCurrentAuthUserId();
  if (currentStoredToken.token !== token || currentStoredToken.userId !== currentUserId) {
    await registerPushToken(token);
    setStoredToken(token, currentUserId);
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
