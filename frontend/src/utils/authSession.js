const AUTH_STORAGE_KEY = 'auth_session';
const LEGACY_USER_STORAGE_KEY = 'user';
const LEGACY_TOKEN_STORAGE_KEY = 'token';

const normalizeUser = (user) => {
  if (!user) return user;
  return {
    ...user,
    name: typeof user.name === 'string' ? user.name.replace(/\s+rep\s*$/i, '').trim() : user.name,
  };
};

const readStoredSession = () => {
  try {
    const rawAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawAuth) {
      return null;
    }

    const parsedAuth = JSON.parse(rawAuth);
    const hasPayload = parsedAuth?.token && parsedAuth?.user;
    const isExpired = !parsedAuth?.expiresAt || parsedAuth.expiresAt <= Date.now();

    if (!hasPayload || isExpired) {
      clearStoredAuthSession();
      return null;
    }

    const user = normalizeUser(parsedAuth.user);
    if (user?.role === 'supervisor') {
      clearStoredAuthSession();
      return null;
    }

    return {
      token: parsedAuth.token,
      user,
      rememberMe: Boolean(parsedAuth.rememberMe),
      expiresAt: parsedAuth.expiresAt,
    };
  } catch {
    clearStoredAuthSession();
    return null;
  }
};

export const clearStoredAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
};

export const getStoredAuthSession = () => readStoredSession();

export const getStoredAuthToken = () => {
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
  if (legacyToken) return legacyToken;
  return readStoredSession()?.token || null;
};

export const getStoredAuthUserId = () => readStoredSession()?.user?.id || null;

export const persistStoredAuthSession = ({ token, user, rememberMe, ttlMs }) => {
  if (!rememberMe || !token || !user) {
    clearStoredAuthSession();
    return;
  }

  const expiresAt = Date.now() + ttlMs;
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token,
      user: normalizeUser(user),
      rememberMe: true,
      expiresAt,
    })
  );
};

export const normalizeStoredAuthUser = normalizeUser;
