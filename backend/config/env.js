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

  return ['http://localhost:3000'];
};

const getPrimaryFrontendUrl = () => getFrontendOrigins()[0];

const getMissingRequiredEnv = () =>
  ['JWT_SECRET']
    .filter((key) => !String(process.env[key] || '').trim());

module.exports = {
  getFrontendOrigins,
  getPrimaryFrontendUrl,
  getMissingRequiredEnv,
};
