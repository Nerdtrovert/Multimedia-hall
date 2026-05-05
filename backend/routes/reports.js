const express = require('express');
const router = express.Router();
const {
  generatePDF,
  generateExcel,
  getAnalytics,
  downloadActionLogs,
  clearActionLogs,
} = require('../controllers/reportController');
const { authenticate, authorizeAdmin, authorizeSupervisor } = require('../middleware/auth');

// Both admin and college users can generate reports for their scope
router.get('/pdf', authenticate, generatePDF);
router.get('/excel', authenticate, generateExcel);

// Analytics only for admin
router.get('/analytics', authenticate, authorizeAdmin, getAnalytics);
router.get('/action-logs/download', authenticate, authorizeSupervisor, downloadActionLogs);
router.delete('/action-logs', authenticate, authorizeSupervisor, clearActionLogs);

module.exports = router;
