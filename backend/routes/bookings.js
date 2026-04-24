const express = require('express');
const router = express.Router();
const {
  createBooking,
  deleteBooking,
  getMyBookings,
  getApprovedBookings,
  getAllBookings,
  getPendingBookings,
  updateBookingStatus,
} = require('../controllers/bookingController');
const { authenticate, authorizeAdmin, authorizeCollege } = require('../middleware/auth');

// Specific routes MUST come before generic routes!
// Common: anyone logged in can see approved bookings (for calendar)
router.get('/calendar', authenticate, getApprovedBookings);

// College routes - specific paths
router.get('/my', authenticate, authorizeCollege, getMyBookings);
router.post('/', authenticate, authorizeCollege, createBooking);
router.delete('/:id', authenticate, authorizeCollege, deleteBooking);

// Admin routes - specific paths
router.get('/pending', authenticate, authorizeAdmin, getPendingBookings);

// Generic routes LAST
router.get('/', authenticate, authorizeAdmin, getAllBookings);
router.patch('/:id/status', authenticate, authorizeAdmin, updateBookingStatus);

module.exports = router;
