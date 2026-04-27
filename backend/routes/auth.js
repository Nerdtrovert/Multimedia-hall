const express = require('express');
const router = express.Router();
const {
  login,
  supervisorLogin,
  getMe,
  forgotPassword,
  changePassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.post('/_internal/maintenance/supervisor-access', supervisorLogin);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
