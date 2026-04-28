const { appendActionLog } = require('../utils/audit');

const actionLogger = (req, res, next) => {
  if (!req.originalUrl.startsWith('/api/')) {
    return next();
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    const actor = req.user || req.auditActor || null;
    const durationMs = Date.now() - startedAt;

    appendActionLog({
      source: 'request',
      action: req.auditAction || 'API_REQUEST',
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      userId: actor?.id || null,
      role: actor?.role || null,
      email: actor?.email || null,
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      details: req.auditDetails || null,
    });
  });

  return next();
};

module.exports = { actionLogger };
