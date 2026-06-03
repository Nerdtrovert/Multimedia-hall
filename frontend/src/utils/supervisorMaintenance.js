export const getActionLogFilename = () =>
  `actions-${new Date().toISOString().slice(0, 10)}.log`;

const normalizeResetTarget = (target) => {
  if (typeof target === 'string') {
    const username = target.trim();
    return username ? { username, email: '', role: '', label: '' } : null;
  }

  const username = String(
    target?.username ?? target?.userName ?? target?.user_name ?? '',
  ).trim();

  if (!username) return null;

  return {
    username,
    email: String(target?.email ?? '').trim(),
    role: String(target?.role ?? '').trim(),
    label: String(target?.label ?? '').trim(),
  };
};

const getRawResetTargets = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.targets)) return payload.targets;
  if (payload && typeof payload === 'object') {
    return Object.entries(payload).map(([username, email]) => ({ username, email }));
  }
  return [];
};

export const normalizeResetTargets = (payload, { prioritizeAdmins = false } = {}) =>
  getRawResetTargets(payload)
    .map(normalizeResetTarget)
    .filter(Boolean)
    .sort((a, b) => {
      if (prioritizeAdmins) {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
      }

      return a.username.localeCompare(b.username, undefined, {
        sensitivity: 'base',
      });
    });
