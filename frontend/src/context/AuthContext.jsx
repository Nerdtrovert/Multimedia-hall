import { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'user';

const readStoredUser = () => {
  try {
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const storeUser = (user) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
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
  const [user, setUser] = useState(() => readStoredUser());
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(() => !readStoredUser() && !!localStorage.getItem('token'));

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

  const fetchMe = async (backgroundRefresh = false) => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      storeUser(res.data);
      preloadRoutes(res.data.role);
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
    const { token: newToken, user: userData } = res.data;
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
