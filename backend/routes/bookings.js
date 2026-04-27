const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getApprovedBookings,
  getAllBookings,
  getPendingBookings,
  cancelMyBooking,
  cancelApprovedBooking,
  updateBookingStatus,
  uploadEventReport,
  getEventReport,
} = require('../controllers/bookingController');
const { authenticate, authorizeAdmin, authorizeCollege } = require('../middleware/auth');
const { uploadPoster, uploadReport } = require('../middleware/upload');

// Common: anyone logged in can see approved bookings (for calendar)
router.get('/calendar', authenticate, getApprovedBookings);

// College routes
router.post('/', authenticate, authorizeCollege, uploadPoster.single('poster'), createBooking);
router.get('/my', authenticate, authorizeCollege, getMyBookings);
router.delete('/:id', authenticate, authorizeCollege, cancelMyBooking);
router.post('/:id/report', authenticate, authorizeCollege, uploadReport.single('event_report'), uploadEventReport);
router.get('/:id/report', authenticate, getEventReport);

// Admin routes
router.get('/', authenticate, authorizeAdmin, getAllBookings);
router.get('/pending', authenticate, authorizeAdmin, getPendingBookings);
router.patch('/:id/status', authenticate, authorizeAdmin, updateBookingStatus);
router.patch('/:id/cancel', authenticate, authorizeAdmin, cancelApprovedBooking);

module.exports = router;
