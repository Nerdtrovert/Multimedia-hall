const db = require('../config/db');
const { sendStatusEmail } = require('../utils/mailer');
const { logAudit } = require('../utils/audit');
const { cleanupStoredAssets, saveBase64Upload } = require('../utils/fileStorage');

// ─── College User: Submit a booking request ─────────────────────────────────
const createBooking = async (req, res) => {
  const { title, purpose, event_date, start_time, end_time, poster, attachment } = req.body;
  const { id: user_id, college_name } = req.user;

  const normalizedTitle = title?.trim();
  const normalizedPurpose = purpose?.trim() || null;

  if (!normalizedTitle || !event_date || !start_time || !end_time) {
    return res.status(400).json({
      message: 'Title, date, start time, and end time are required.',
    });
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
      event_date,
      end_time,
      start_time,
    ]);

    if (conflicts.length > 0) {
      return res.status(409).json({
        message: 'Time slot conflicts with an existing booking.',
      });
    }

    let savedPoster = null;
    let savedAttachment = null;

    try {
      if (poster) {
        savedPoster = await saveBase64Upload(poster, 'poster');
      }

      if (attachment) {
        savedAttachment = await saveBase64Upload(attachment, 'attachment');
      }

      const [result] = await db.query(
        `INSERT INTO bookings
        (user_id, college_name, title, purpose, event_date, start_time, end_time, poster_url, poster_name, attachment_url, attachment_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          college_name,
          normalizedTitle,
          normalizedPurpose,
          event_date,
          start_time,
          end_time,
          savedPoster?.url || null,
          savedPoster?.name || null,
          savedAttachment?.url || null,
          savedAttachment?.name || null,
        ]
      );

      await logAudit(
        'BOOKING_CREATED',
        user_id,
        result.insertId,
        `${college_name} submitted booking for ${event_date}`
      );

      return res.status(201).json({
        message: 'Booking request submitted successfully.',
        bookingId: result.insertId,
      });
    } catch (err) {
      await Promise.allSettled([
        cleanupStoredAssets({ poster_url: savedPoster?.url }),
        cleanupStoredAssets({ attachment_url: savedAttachment?.url }),
      ]);

      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }

      throw err;
    }
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── College User: Get own bookings ─────────────────────────────────────────
// College User: Delete own booking (pending/rejected only)
const deleteBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = rows[0];

    await db.query('DELETE FROM bookings WHERE id = ? AND user_id = ?', [id, req.user.id]);
    await cleanupStoredAssets(booking);

    await logAudit(
      'BOOKING_DELETED',
      req.user.id,
      id,
      `${booking.college_name} deleted booking ${id}`
    );

    return res.json({ message: 'Booking deleted successfully.' });
  } catch (err) {
    console.error('Delete booking error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY event_date DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get my bookings error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Common: Get approved bookings ──────────────────────────────────────────
const getApprovedBookings = async (req, res) => {
  const { start, end } = req.query;

  try {
    const [rows] = await db.query(
      `SELECT id, title, college_name, event_date, start_time, end_time, purpose, poster_url
       FROM bookings
       WHERE status = 'approved'
         AND event_date BETWEEN ? AND ?
       ORDER BY event_date ASC`,
      [start, end]
    );

    res.json(rows);
  } catch (err) {
    console.error('Get approved bookings error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Admin: Get all bookings ────────────────────────────────────────────────
const getAllBookings = async (req, res) => {
  const { college, status, from, to } = req.query;

  let query = `
    SELECT b.*, u.email AS user_email 
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (college) {
    query += ' AND b.college_name = ?';
    params.push(college);
  }

  if (status) {
    query += ' AND b.status = ?';
    params.push(status);
  }

  if (from) {
    query += ' AND b.event_date >= ?';
    params.push(from);
  }

  if (to) {
    query += ' AND b.event_date <= ?';
    params.push(to);
  }

  query += ' ORDER BY b.created_at DESC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get all bookings error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Admin: Get pending bookings ────────────────────────────────────────────
const getPendingBookings = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.email AS user_email 
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.status = 'pending'
       ORDER BY b.created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Get pending bookings error:', err);
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
      `SELECT b.*, u.email, u.name AS user_name
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
  deleteBooking,
  getMyBookings,
  getApprovedBookings,
  getAllBookings,
  getPendingBookings,
  updateBookingStatus,
};
