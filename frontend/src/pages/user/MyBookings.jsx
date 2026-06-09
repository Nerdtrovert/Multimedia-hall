import { useCallback, useEffect, useState } from 'react';
import {
  cancelBookingRequest,
  getMyBookings,
  toApiFileUrl,
  uploadEventReport
} from '../../utils/api';
import { getReportDownloadRoute, getReportViewRoute } from '../../utils/fileHelpers';
import Navbar from '../../components/common/Navbar';
import PageBackButton from '../../components/common/PageBackButton';
import StatusBadge from '../../components/common/StatusBadge';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportFiles, setSelectedReportFiles] = useState({});
  const [uploadingBookingId, setUploadingBookingId] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const fetchBookings = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await getMyBookings();
      setBookings(res.data);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useAutoRefresh(() => fetchBookings(false), 10000);

  const canUploadReport = (booking) => {
    if (!['approved', 'concluded'].includes(booking.status)) return false;

    const datePart = toDateKey(booking.event_date);
    const endPart = String(booking.end_time || '').slice(0, 8);
    const eventEnd = new Date(`${datePart}T${endPart}`);

    if (Number.isNaN(eventEnd.getTime())) return false;
    return new Date() >= eventEnd;
  };

  const canCancelBooking = (booking) => {
    if (booking.status === 'concluded') return false;
    const datePart = toDateKey(booking.event_date);
    const endPart = String(booking.end_time || '').slice(0, 8);
    const eventEnd = new Date(`${datePart}T${endPart}`);

    if (Number.isNaN(eventEnd.getTime())) return true;
    return new Date() < eventEnd;
  };

  const handleReportFileChange = (bookingId, file) => {
    setSelectedReportFiles((prev) => ({ ...prev, [bookingId]: file || null }));
  };



  const submitEventReport = async (booking) => {
    const selectedFile = selectedReportFiles[booking.id];
    if (!selectedFile) {
      toast.error('Please choose a PDF file first.');
      return;
    }

    setUploadingBookingId(booking.id);
    try {
      await uploadEventReport(booking.id, selectedFile);
      toast.success('Event report uploaded successfully.');
      setSelectedReportFiles((prev) => ({ ...prev, [booking.id]: null }));
      await fetchBookings(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload event report.');
    } finally {
      setUploadingBookingId(null);
    }
  };

  const openCancelModal = (booking) => {
    setCancelModalBooking(booking);
  };

  const closeCancelModal = () => {
    if (cancellingBookingId) return;
    setCancelModalBooking(null);
    setCancellationReason('');
  };

  const cancelRequest = async () => {
    if (!cancelModalBooking) return;
    
    if (!cancellationReason.trim()) {
      toast.error('Please provide a reason for cancellation.');
      return;
    }

    setCancellingBookingId(cancelModalBooking.id);
    try {
      await cancelBookingRequest(cancelModalBooking.id, cancellationReason);
      toast.success('Booking request cancelled.');
      setCancelModalBooking(null);
      setCancellationReason('');
      await fetchBookings(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking request.');
    } finally {
      setCancellingBookingId(null);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-page">
        <PageBackButton fallback="/user/dashboard" />

        <div className="page-header">
          <h2>My Booking Requests</h2>
          <p>Track the status of all your submitted requests.</p>
          <p style={{ marginTop: 6, color: '#6b7280', fontSize: 14 }}>
            For approved events, upload the post-event report here after the event ends.
          </p>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : bookings.length === 0 ? (

          /* ✅ unified empty state */
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No bookings yet</h3>
            <p>Your submitted bookings will appear here.</p>
          </div>

        ) : (
          <div className="table-card card">
            <p className="result-count">
              {bookings.length} record(s)
            </p>

            <table className="bookings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Poster</th>
                   <th>Event Report</th>
                   <th>Actions</th>
                   <th>Admin Note</th>
                   <th>Submitted</th>
                 </tr>
              </thead>

              <tbody>
                {bookings.map((b, i) => (
                  <tr key={b.id}>
                    <td>{i + 1}</td>
<td><strong>{b.title}</strong></td>

<td>{new Date(b.event_date).toLocaleDateString('en-GB')}</td>

<td>{b.start_time} – {b.end_time}</td>

<td><StatusBadge status={b.status} /></td>

<td>
  {b.poster_url ? (
    <div style={{ display: 'grid', gap: 6 }}>
      <a href={toApiFileUrl(b.poster_url)} target="_blank" rel="noopener noreferrer">
        <img
          src={toApiFileUrl(b.poster_url)}
          alt={`${b.title} poster`}
          className="table-poster-thumb"
        />
      </a>
      <a
        className="link-btn"
        href={toApiFileUrl(b.poster_url)}
        target="_blank"
        rel="noopener noreferrer"
      >
        View poster
      </a>
    </div>
  ) : (
    <span style={{ color: '#9ca3af' }}>—</span>
  )}
</td>

<td>
  <div style={{ display: 'grid', gap: 6 }}>
    {b.event_report_url ? (
      <div style={{ display: 'grid', gap: 6 }}>
        <a
          href={getReportViewRoute(b)}
          className="link-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          View report
        </a>
        <a
          href={getReportDownloadRoute(b)}
          className="link-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download report
        </a>
      </div>
    ) : (
      <span style={{ color: '#9ca3af' }}>No report</span>
    )}

    {canUploadReport(b) ? (
      <div style={{ display: 'grid', gap: 6 }}>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) =>
            handleReportFileChange(b.id, e.target.files?.[0])
          }
        />
        <button
          type="button"
          className="btn-primary"
          onClick={() => submitEventReport(b)}
          disabled={
            !selectedReportFiles[b.id] ||
            uploadingBookingId === b.id
          }
          style={{ padding: '6px 10px', fontSize: 12 }}
        >
          {uploadingBookingId === b.id
            ? 'Uploading...'
            : 'Upload report'}
        </button>
      </div>
    ) : ['approved', 'concluded'].includes(b.status) ? (
      <span style={{ color: '#9ca3af', fontSize: 12 }}>
        Upload enabled after event ends.
      </span>
    ) : (
      <span style={{ color: '#9ca3af', fontSize: 12 }}>
        Available only for approved events.
      </span>
    )}
  </div>
</td>

<td>
  {['pending', 'approved'].includes(b.status) && b.status !== 'cancelled' && canCancelBooking(b) ? (
    <button
      type="button"
      className="btn-secondary"
      onClick={() => openCancelModal(b)}
      disabled={cancellingBookingId === b.id}
      style={{ padding: '6px 10px', fontSize: 12 }}
    >
      {cancellingBookingId === b.id
        ? 'Cancelling...'
        : 'Cancel request'}
    </button>
  ) : (
    <span style={{ color: '#9ca3af' }}>—</span>
  )}
</td>

<td>
  {b.admin_note || <span style={{ color: '#9ca3af' }}>—</span>}
</td>

<td>{new Date(b.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cancelModalBooking && (
        <div className="confirmation-modal-overlay" onClick={closeCancelModal}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel booking request</h3>
            <p>
              Cancel <strong>{cancelModalBooking.title}</strong>? This cannot be undone.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="cancel-reason" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Reason for cancellation <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                id="cancel-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please provide a reason for cancelling this booking..."
                disabled={Boolean(cancellingBookingId)}
                style={{
                  width: '100%',
                  padding: 10,
                  minHeight: 80,
                  borderRadius: 4,
                  border: '1px solid #d1d5db',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  resize: 'vertical',
                }}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeCancelModal}
                disabled={Boolean(cancellingBookingId)}
              >
                Keep request
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={cancelRequest}
                disabled={Boolean(cancellingBookingId) || !cancellationReason.trim()}
              >
                {cancellingBookingId ? 'Cancelling...' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
