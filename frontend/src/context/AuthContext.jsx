import { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import {
  disablePushNotifications,
  enablePushNotifications,
  isRunningInstalledApp,
} from '../utils/pushNotifications';
import { stripRepSuffix } from '../utils/displayName';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'user';

const normalizeUser = (user) => {
  if (!user) return user;
  return {
    ...user,
    name: stripRepSuffix(user.name),
  };
};

const readStoredUser = () => {
  try {
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!rawUser) return null;
    const parsedUser = JSON.parse(rawUser);
    if (parsedUser?.role === 'supervisor') {
      localStorage.removeItem('token');
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
    return normalizeUser(parsedUser);
  } catch {
    return null;
  }
};

const storeUser = (user) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizeUser(user)));
};

const preloadRoutes = (role) => {
  if (['admin', 'supervisor'].includes(role)) {
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
  const initialUser = readStoredUser();
  const initialToken = localStorage.getItem('token');

  const [user, setUser] = useState(() => initialUser);
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(() => !initialUser && !!initialToken);

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

    const setupPush = (requestPermission) => {
      enablePushNotifications({ requestPermission }).catch((err) => {
        console.error('Push notifications setup failed:', err);
      });
    };

    setupPush(isRunningInstalledApp());

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
      const normalizedUser = normalizeUser(res.data);
      setUser(normalizedUser);
      storeUser(normalizedUser);
      preloadRoutes(normalizedUser.role);
    } catch {
      logout();
    } finally {
      if (!backgroundRefresh) {
        setLoading(false);
      }
    }
  };

  const performLogin = async (email, password, endpoint = '/auth/login') => {
    const res = await api.post(endpoint, { email, password });
    const { token: newToken, user: rawUserData } = res.data;
    const userData = normalizeUser(rawUserData);
    localStorage.setItem('token', newToken);
    storeUser(userData);
    setToken(newToken);
    setUser(userData);
    setLoading(false);
    preloadRoutes(userData.role);
    return userData;
  };

  const login = async (email, password) => performLogin(email, password, '/auth/login');
  const loginSupervisor = async (email, password) =>
    performLogin(email, password, '/auth/_internal/maintenance/supervisor-access');

  const logout = () => {
    disablePushNotifications().catch((err) => {
      console.error('Push notification cleanup failed:', err);
    });
    localStorage.removeItem('token');
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginSupervisor, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
