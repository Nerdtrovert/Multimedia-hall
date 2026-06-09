const fs = require('fs');
const path = require('path');

const normalizeUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const parseOriginList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => normalizeUrl(item))
    .filter(Boolean);

const lastKnownOriginFile = path.resolve(__dirname, '..', '.last_known_origin');

const saveLastKnownOrigin = (origin) => {
  try {
    if (origin && origin.includes('.devtunnels.ms')) {
      const normalized = normalizeUrl(origin);
      let currentStored = '';
      if (fs.existsSync(lastKnownOriginFile)) {
        currentStored = fs.readFileSync(lastKnownOriginFile, 'utf8').trim();
      }
      if (normalized !== currentStored) {
        fs.writeFileSync(lastKnownOriginFile, normalized, 'utf8');
      }
    }
  } catch (err) {
    console.error('Error saving last known origin:', err);
  }
};

const getLastKnownOrigin = () => {
  try {
    if (fs.existsSync(lastKnownOriginFile)) {
      return fs.readFileSync(lastKnownOriginFile, 'utf8').trim();
    }
  } catch (err) {
    // ignore
  }
  return '';
};

const getFrontendOrigins = () => {
  const configuredOrigins = parseOriginList(process.env.FRONTEND_URL);

  const lastKnown = getLastKnownOrigin();
  if (lastKnown) {
    configuredOrigins.push(lastKnown);
  }

  if (configuredOrigins.length > 0) {
    return [...new Set(configuredOrigins)];
  }

  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
};

const getPrimaryFrontendUrl = () => {
  const origins = getFrontendOrigins();
  const publicOrigin = origins.find(
    (origin) => !origin.includes('localhost') && !origin.includes('127.0.0.1')
  );
  return publicOrigin || origins[0] || '';
};

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
  saveLastKnownOrigin,
};
