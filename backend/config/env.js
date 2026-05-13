const normalizeUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const parseOriginList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => normalizeUrl(item))
    .filter(Boolean);

const getFrontendOrigins = () => {
  const configuredOrigins = parseOriginList(process.env.FRONTEND_URL);
  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
};

const getPrimaryFrontendUrl = () => getFrontendOrigins()[0];

const getBackendOrigins = () => parseOriginList(process.env.BACKEND_URL);

const getPrimaryBackendUrl = () => getBackendOrigins()[0] || '';

const getMissingRequiredEnv = () =>
  ['JWT_SECRET']
    .filter((key) => !String(process.env[key] || '').trim());

module.exports = {
  normalizeUrl,
  parseOriginList,
  getFrontendOrigins,
  getPrimaryFrontendUrl,
  getBackendOrigins,
  getPrimaryBackendUrl,
  getMissingRequiredEnv,
};
