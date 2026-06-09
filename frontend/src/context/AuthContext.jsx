import { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  persistStoredAuthSession,
  normalizeStoredAuthUser,
} from '../utils/authSession';
import {
  disablePushNotifications,
  enablePushNotifications,
  isRunningInstalledApp,
} from '../utils/pushNotifications';

const AuthContext = createContext(null);
const PWA_REMEMBER_TTL_MS = 28 * 24 * 60 * 60 * 1000;
const BROWSER_REMEMBER_TTL_MS = 10 * 60 * 1000;

const getRememberMeTtl = () =>
  isRunningInstalledApp() ? PWA_REMEMBER_TTL_MS : BROWSER_REMEMBER_TTL_MS;

const preloadRoutes = (role) => {
  if (role === 'admin') {
    Promise.allSettled([
      import('../pages/admin/AdminDashboard'),
      import('../pages/admin/AdminRequests'),
      import('../pages/admin/AllBookings'),
      import('../pages/CalendarView'),
      import('../pages/Reports'),
      import('../pages/ChangePassword'),
    ]);
    return;
  }

  if (role === 'supervisor') {
    Promise.allSettled([
      import('../pages/supervisor/SupervisorDashboard'),
      import('../pages/CalendarView'),
      import('../pages/Reports'),
      import('../pages/ChangePassword'),
    ]);
    return;
  }

  Promise.allSettled([
    import('../pages/user/UserDashboard'),
    import('../pages/user/NewBooking'),
    import('../pages/user/MyBookings'),
    import('../pages/CalendarView'),
    import('../pages/Reports'),
    import('../pages/ChangePassword'),
  ]);
};

export const AuthProvider = ({ children }) => {
  const initialAuth = getStoredAuthSession() || { token: null, user: null, rememberMe: false };

  const [user, setUser] = useState(() => initialAuth.user);
  const [token, setToken] = useState(() => initialAuth.token);
  const [rememberMe, setRememberMe] = useState(() => initialAuth.rememberMe);
  const [loading, setLoading] = useState(() => !initialAuth.user && !!initialAuth.token);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      return;
    }
    delete api.defaults.headers.common.Authorization;
  }, [token]);

  useEffect(() => {
    if (token) {
      if (user) {
        setLoading(false);
        fetchMe(true);
      } else {
        fetchMe();
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;

    const canPromptForPush =
      typeof window !== 'undefined' &&
      window.isSecureContext &&
      'Notification' in window;

    const setupPush = (requestPermission = true) => {
      enablePushNotifications({ requestPermission, userId: user.id }).catch((err) => {
        console.error('Push notifications setup failed:', err);
      });
    };

    if (typeof window !== 'undefined') {
      setupPush(true);
    };

    const onAppInstalled = () => {
      setupPush(true);
    };

    window.addEventListener('appinstalled', onAppInstalled);

    const media = window.matchMedia('(display-mode: standalone)');
    const onStandaloneChange = (event) => {
      if (event.matches) {
        setupPush(true);
      }
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onStandaloneChange);
    } else if (typeof media.addListener === 'function') {
      media.addListener(onStandaloneChange);
    }

    return () => {
      window.removeEventListener('appinstalled', onAppInstalled);
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', onStandaloneChange);
      } else if (typeof media.removeListener === 'function') {
        media.removeListener(onStandaloneChange);
      }
    };
  }, [token, user]);

  const fetchMe = async (backgroundRefresh = false) => {
    try {
      const res = await api.get('/auth/me');
      const normalizedUser = normalizeStoredAuthUser(res.data);
      setUser(normalizedUser);
      persistStoredAuthSession({ token, user: normalizedUser, rememberMe, ttlMs: getRememberMeTtl() });
      preloadRoutes(normalizedUser.role);
    } catch {
      logout();
    } finally {
      if (!backgroundRefresh) {
        setLoading(false);
      }
    }
  };

  const performLogin = async (payload, endpoint = '/auth/login', shouldRememberMe = false) => {
    const res = await api.post(endpoint, payload);
    const { token: newToken, user: rawUserData } = res.data;
    const userData = normalizeStoredAuthUser(rawUserData);
    setToken(newToken);
    setUser(userData);
    setRememberMe(shouldRememberMe);
    persistStoredAuthSession({
      token: newToken,
      user: userData,
      rememberMe: shouldRememberMe,
      ttlMs: getRememberMeTtl(),
    });
    setLoading(false);

    preloadRoutes(userData.role);
    return userData;
  };

  const login = async (email, password, shouldRememberMe = false) =>
    performLogin({ email, password }, '/auth/login', shouldRememberMe);
  const loginSupervisor = async (password) =>
    performLogin({ password }, '/auth/_internal/maintenance/supervisor-access');

  const logout = () => {
    disablePushNotifications().catch((err) => {
      console.error('Push notification cleanup failed:', err);
    });
    clearStoredAuthSession();
    setToken(null);
    setUser(null);
    setRememberMe(false);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginSupervisor, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
