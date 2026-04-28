const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { sendStatusEmail } = require('../utils/mailer');
const { sendBookingStatusPush } = require('../utils/pushNotifications');
const { logAudit } = require('../utils/audit');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const bookingListSelect = `
  b.id,
  b.user_id,
  b.college_name,
  b.title,
  b.purpose,
  b.poster_file_path,
  b.poster_original_name,
  b.poster_mime_type,
  b.poster_uploaded_at,
  DATE_FORMAT(b.event_date, '%Y-%m-%d') AS event_date,
  b.start_time,
  b.end_time,
  b.event_report_file_path,
  b.event_report_original_name,
  b.event_report_mime_type,
  b.event_report_uploaded_at,
  b.status,
  b.admin_note,
  b.created_at,
  b.updated_at,
  CASE
    WHEN b.event_report_data IS NOT NULL OR b.event_report_file_path IS NOT NULL THEN 1
    ELSE 0
  END AS has_event_report
`;

const toDateKey = (dateValue) => {
  if (!dateValue) return '';
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = `${dateValue.getMonth() + 1}`.padStart(2, '0');
    const day = `${dateValue.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(dateValue).split('T')[0];
};

const toApiPosterUrl = (posterPath) => (posterPath ? `/uploads/${posterPath.replace(/\\/g, '/')}` : null);

const withFileLinks = (booking) => ({
  ...booking,
  poster_url: toApiPosterUrl(booking.poster_file_path),
  event_report_url:
    Number(booking.has_event_report || 0) > 0 || booking.event_report_file_path
      ? `/api/bookings/${booking.id}/report`
      : null,
});

// ─── College User: Submit a booking request ─────────────────────────────────
const createBooking = async (req, res) => {
  const { title, purpose, event_date, start_time, end_time } = req.body;
  const { id: user_id, college_name } = req.user;
  const posterFile = req.file || null;
  const normalizedEventDate = String(event_date || '').split('T')[0];
  const todayKey = toDateKey(new Date());

  if (!title || !event_date || !start_time || !end_time) {
    return res.status(400).json({
      message: 'Title, date, start time, and end time are required.',
    });
  }

  if (!normalizedEventDate) {
    return res.status(400).json({ message: 'Invalid event date.' });
  }

  if (normalizedEventDate < todayKey) {
    return res.status(400).json({ message: 'Bookings cannot be created for past dates.' });
  }

  if (start_time >= end_time) {
    return res.status(400).json({
      message: 'Start time must be before end time.',
    });
  }

  const conflictQuery = `
    SELECT id
    FROM bookings
    WHERE event_date = ?
      AND status IN ('approved', 'pending')
      AND start_time < ?
      AND end_time > ?
  `;

  try {
    const [conflicts] = await db.query(conflictQuery, [
      normalizedEventDate,
      end_time,
      start_time,
    ]);

    if (conflicts.length > 0) {
      return res.status(409).json({
        message: 'Time slot conflicts with an existing booking.',
      });
    }

    const [result] = await db.query(
      `INSERT INTO bookings 
      (user_id, college_name, title, purpose, poster_file_path, poster_original_name, poster_mime_type, poster_uploaded_at, event_date, start_time, end_time) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        college_name,
        title,
        purpose,
        posterFile ? `posters/${posterFile.filename}` : null,
        posterFile ? posterFile.originalname : null,
        posterFile ? posterFile.mimetype : null,
        posterFile ? new Date() : null,
        normalizedEventDate,
        start_time,
        end_time,
      ]
    );

    await logAudit(
      'BOOKING_CREATED',
      user_id,
      result.insertId,
      `${college_name} submitted booking for ${normalizedEventDate}`
    );

    res.status(201).json({
      message: 'Booking request submitted successfully.',
      bookingId: result.insertId,
    });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── College User: Get own bookings ─────────────────────────────────────────
const getMyBookings = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ${bookingListSelect}
       FROM bookings b
       WHERE b.user_id = ?
       ORDER BY b.event_date DESC`,
      [req.user.id]
    );
    res.json(rows.map(withFileLinks));
  } catch (err) {
    console.error('Get my bookings error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Common: Get approved bookings ──────────────────────────────────────────
const getApprovedBookings = async (req, res) => {
  const { start, end } = req.query;
  const startDate = String(start || '').split('T')[0];
  const endDate = String(end || '').split('T')[0];

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start and end dates are required.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, title, college_name, DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date,
              start_time, end_time, purpose, status, poster_file_path, event_report_file_path,
              CASE
                WHEN event_report_data IS NOT NULL OR event_report_file_path IS NOT NULL THEN 1
                ELSE 0
              END AS has_event_report
       FROM bookings
       WHERE status = 'approved'
         AND event_date >= ?
         AND event_date < ?
        ORDER BY event_date ASC`,
      [startDate, endDate]
    );

    res.json(rows.map(withFileLinks));
  } catch (err) {
    console.error('Get approved bookings error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Admin: Get all bookings ────────────────────────────────────────────────
const getAllBookings = async (req, res) => {
  const { college, status, from, to, page, limit } = req.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const offset = (pageNum - 1) * limitNum;

  let baseQuery = `
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (college) {
    baseQuery += ' AND b.college_name = ?';
    params.push(college);
  }

  if (status) {
    baseQuery += ' AND b.status = ?';
    params.push(status);
  }

  if (from) {
    baseQuery += ' AND b.event_date >= ?';
    params.push(from);
  }

  if (to) {
    baseQuery += ' AND b.event_date <= ?';
    params.push(to);
  }

  const countQuery = `SELECT COUNT(*) AS total ${baseQuery}`;
  const dataQuery = `
    SELECT ${bookingListSelect}, u.email AS user_email
    ${baseQuery}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `;

  try {
    const [[{ total }]] = await db.query(countQuery, params);
    const [rows] = await db.query(dataQuery, [...params, limitNum, offset]);
    
    res.json({
      data: rows.map(withFileLinks),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Get all bookings error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Admin: Get pending bookings ────────────────────────────────────────────
const getPendingBookings = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ${bookingListSelect}, u.email AS user_email
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.status = 'pending'
       ORDER BY b.created_at ASC`
    );
    res.json(rows.map(withFileLinks));
  } catch (err) {
    console.error('Get pending bookings error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};



// ─── College User: Upload post-event report PDF ──────────────────────────────
const uploadEventReport = async (req, res) => {
  const { id } = req.params;
  const reportFile = req.file;

  if (!reportFile) {
    return res.status(400).json({ message: 'Event report PDF is required.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, user_id, status, event_date, end_time, event_report_file_path
       FROM bookings
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = rows[0];

    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only upload reports for your own bookings.' });
    }

    if (booking.status !== 'approved') {
      return res.status(400).json({ message: 'Event report can only be uploaded for approved bookings.' });
    }

    const eventDate = toDateKey(booking.event_date);
    const endTime = String(booking.end_time || '').slice(0, 8);
    const eventEnd = new Date(`${eventDate}T${endTime}`);

    if (Number.isNaN(eventEnd.getTime())) {
      return res.status(400).json({ message: 'Invalid event date or end time for this booking.' });
    }

    if (new Date() < eventEnd) {
      return res.status(400).json({ message: 'Event report upload is allowed only after the event has ended.' });
    }

    if (booking.event_report_file_path) {
      const oldPath = path.join(uploadsRoot, booking.event_report_file_path);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await db.query(
      `UPDATE bookings
       SET event_report_data = ?, event_report_file_path = NULL,
           event_report_original_name = ?, event_report_mime_type = ?, event_report_uploaded_at = ?
       WHERE id = ?`,
      [reportFile.buffer, reportFile.originalname, reportFile.mimetype, new Date(), id]
    );

    await logAudit(
      'EVENT_REPORT_UPLOADED',
      req.user.id,
      id,
      `Event report uploaded for booking ${id}`
    );

    res.json({ message: 'Event report uploaded successfully.', event_report_url: `/api/bookings/${id}/report` });
  } catch (err) {
    console.error('Upload event report error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Admin/Owner: View event report PDF ──────────────────────────────────────
const getEventReport = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT id, user_id, status, event_report_file_path, event_report_data, event_report_original_name, event_report_mime_type
       FROM bookings
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = rows[0];
    if (!booking.event_report_data && !booking.event_report_file_path) {
      return res.status(404).json({ message: 'Event report not uploaded yet.' });
    }

    const isOwner = req.user.id === booking.user_id;
    const isAdmin = ['admin', 'supervisor'].includes(req.user.role);

    const isApproved = booking.status === 'approved';

    if (!isAdmin && !isOwner && !isApproved) {
      return res.status(403).json({ message: 'You are not authorized to access this report.' });
    }

    res.setHeader('Content-Type', booking.event_report_mime_type || 'application/pdf');
    const shouldDownload = ['1', 'true', 'yes'].includes(
      String(req.query.download || '').toLowerCase()
    );
    const dispositionMode = shouldDownload ? 'attachment' : 'inline';
    res.setHeader(
      'Content-Disposition',
      `${dispositionMode}; filename="${encodeURIComponent(
        booking.event_report_original_name || `event-report-${id}.pdf`
      )}"`
    );

    if (booking.event_report_data) {
      return res.send(booking.event_report_data);
    }

    const filePath = path.join(uploadsRoot, booking.event_report_file_path || '');
    if (!booking.event_report_file_path || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Stored event report file not found.' });
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error('Get event report error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── College User: Cancel own pending booking ─────────────────────────────────
const cancelMyBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT id, user_id, status, title, poster_file_path, event_report_file_path
       FROM bookings
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = rows[0];
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own booking requests.' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending booking requests can be cancelled.' });
    }

    await db.query('DELETE FROM bookings WHERE id = ? AND user_id = ?', [id, req.user.id]);

    if (booking.poster_file_path) {
      const posterPath = path.join(uploadsRoot, booking.poster_file_path);
      if (fs.existsSync(posterPath)) fs.unlinkSync(posterPath);
    }

    if (booking.event_report_file_path) {
      const reportPath = path.join(uploadsRoot, booking.event_report_file_path);
      if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);
    }

    await logAudit(
      'BOOKING_CANCELLED_BY_USER',
      req.user.id,
      id,
      `Booking "${booking.title}" cancelled by requester`
    );

    res.json({ message: 'Booking request cancelled successfully.' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Admin: Update booking status ───────────────────────────────────────────
const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status, admin_note } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      message: 'Status must be approved or rejected.',
    });
  }

  try {
    const [bookingRows] = await db.query(
      `SELECT b.id, b.user_id, b.title, b.college_name, b.event_date, b.start_time, b.end_time, b.status,
              u.email, u.name AS user_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    if (bookingRows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = bookingRows[0];

    // Conflict check if approving
    if (status === 'approved') {
      const [conflicts] = await db.query(
        `SELECT id
         FROM bookings
         WHERE id != ?
           AND event_date = ?
           AND status = 'approved'
           AND start_time < ?
           AND end_time > ?`,
        [id, booking.event_date, booking.end_time, booking.start_time]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({
          message: 'Cannot approve: time conflict with another booking.',
        });
      }
    }

    // Update booking
    await db.query(
      'UPDATE bookings SET status = ?, admin_note = ? WHERE id = ?',
      [status, admin_note || null, id]
    );

    // Send email (optional)
    if (booking.email) {
      await sendStatusEmail(
      booking.email,
      booking.user_name || booking.college_name,
      booking,
      status,
      admin_note
    );
    }

    try {
      await sendBookingStatusPush(booking.user_id, booking, status);
    } catch (pushErr) {
      console.error('Booking status push failed:', pushErr.message);
    }

    // Audit log
    await logAudit(
      'BOOKING_STATUS_UPDATED',
      req.user.id,
      id,
      `Booking ${id} marked as ${status}`
    );

    res.json({
      message: `Booking ${status} successfully.`,
    });
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getApprovedBookings,
  getAllBookings,
  getPendingBookings,
  cancelMyBooking,
  updateBookingStatus,
  uploadEventReport,
  getEventReport,
};
