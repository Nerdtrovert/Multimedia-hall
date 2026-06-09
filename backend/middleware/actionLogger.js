const { appendActionLog, formatActorIdentity } = require('../utils/audit');

const actionLogger = (req, res, next) => {
  if (!req.originalUrl.startsWith('/api/')) {
    return next();
  }

  res.on('finish', () => {
    const actor = req.user || req.auditActor || null;

    if (req.auditAction === 'LOGIN_SUCCESS' || req.auditAction === 'SUPERVISOR_LOGIN_SUCCESS') {
      appendActionLog(`LOGIN | ${formatActorIdentity(actor)} logged in`);
      return;
    }

    if (req.auditAction === 'LOGIN_FAILED' || req.auditAction === 'SUPERVISOR_LOGIN_FAILED') {
      appendActionLog(`LOGIN FAILED | ${formatActorIdentity(actor)} | ${req.auditDetails || 'Invalid credentials.'}`);
      return;
    }

    if (req.auditAction === 'LOGIN_REJECTED_SUPERVISOR_ROUTE' || req.auditAction === 'SUPERVISOR_LOGIN_DENIED') {
      appendActionLog(`LOGIN DENIED | ${formatActorIdentity(actor)} | ${req.auditDetails || 'Access denied.'}`);
      return;
    }

    if (req.auditAction === 'LOGIN_ERROR' || req.auditAction === 'SUPERVISOR_LOGIN_ERROR') {
      appendActionLog(`LOGIN ERROR | ${formatActorIdentity(actor)} | ${req.auditDetails || 'Request failed.'}`);
    }
  });

  return next();
};

module.exports = { actionLogger };
