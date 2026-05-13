const jwt = require('jsonwebtoken');

const getTokenFromRequest = (req) => {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  if (headerToken) {
    return headerToken;
  }

  const queryToken = String(req.query?.access_token || '').trim();
  if (queryToken) {
    return queryToken;
  }

  return null;
};

const authenticate = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, college_name }
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (!['admin', 'supervisor'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin or supervisor access required.' });
  }
  next();
};

const authorizeCollege = (req, res, next) => {
  if (req.user.role !== 'college') {
    return res.status(403).json({ message: 'College user access required.' });
  }
  next();
};

const authorizeSupervisor = (req, res, next) => {
  if (req.user.role !== 'supervisor') {
    return res.status(403).json({ message: 'Supervisor access required.' });
  }
  next();
};

module.exports = { authenticate, authorizeAdmin, authorizeCollege, authorizeSupervisor };
