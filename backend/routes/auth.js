const express = require('express');
const router = express.Router();
const {
  login,
  supervisorLogin,
  getMe,
  forgotPassword,
  changePassword,
  supervisorResetUserEmail,
  listSupervisorResetUsers,
  supervisorResetOperationalData,
  registerPushToken,
  unregisterPushToken,
} = require('../controllers/authController');
const { authenticate, authorizeSupervisor } = require('../middleware/auth');

router.post('/login', login);
router.post('/_internal/maintenance/supervisor-access', supervisorLogin);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.get('/_internal/maintenance/reset-user-targets', authenticate, authorizeSupervisor, listSupervisorResetUsers);
router.post('/_internal/maintenance/reset-user-email', authenticate, authorizeSupervisor, supervisorResetUserEmail);
router.post('/_internal/maintenance/reset-operational-data', authenticate, authorizeSupervisor, supervisorResetOperationalData);
router.post('/push-token', authenticate, registerPushToken);
router.delete('/push-token', authenticate, unregisterPushToken);

module.exports = router;
