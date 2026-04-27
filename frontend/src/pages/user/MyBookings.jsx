import { useCallback, useEffect, useState } from 'react';
import {
  cancelBookingRequest,
  downloadProtectedFile,
  getMyBookings,
  openProtectedFileInNewTab,
  toApiFileUrl,
  uploadEventReport,
} from '../../utils/api';
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
    if (booking.status !== 'approved') return false;

    const datePart = toDateKey(booking.event_date);
    const endPart = String(booking.end_time || '').slice(0, 8);
    const eventEnd = new Date(`${datePart}T${endPart}`);

    if (Number.isNaN(eventEnd.getTime())) return false;
    return new Date() >= eventEnd;
  };

  const handleReportFileChange = (bookingId, file) => {
    setSelectedReportFiles((prev) => ({ ...prev, [bookingId]: file || null }));
  };

  const openReport = async (booking) => {
    if (!booking.event_report_url) return;
    try {
      await openProtectedFileInNewTab(booking.event_report_url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open event report.');
    }
  };

  const downloadReport = async (booking) => {
    if (!booking.event_report_url) return;
    const separator = booking.event_report_url.includes('?') ? '&' : '?';
    const downloadPath = `${booking.event_report_url}${separator}download=1`;
    try {
      await downloadProtectedFile(downloadPath, `${booking.title || 'event'}-report.pdf`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download event report.');
    }
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

  const cancelRequest = async (booking) => {
    const confirmed = window.confirm(`Cancel "${booking.title}"? This cannot be undone.`);
    if (!confirmed) return;

    setCancellingBookingId(booking.id);
    try {
      await cancelBookingRequest(booking.id);
      toast.success('Booking request cancelled.');
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
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : bookings.length === 0 ? (
          <p className="empty-msg">No bookings found.</p>
        ) : (
          <div className="table-card">
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
                    <td>{new Date(b.event_date).toLocaleDateString()}</td>
                    <td>{b.start_time} – {b.end_time}</td>
                    <td><StatusBadge status={b.status} /></td>
                     <td>
                       {b.poster_url ? (
                         <div style={{ display: 'grid', gap: 6 }}>
                           <a href={toApiFileUrl(b.poster_url)} target="_blank" rel="noopener noreferrer">
                             <img src={toApiFileUrl(b.poster_url)} alt={`${b.title} poster`} className="table-poster-thumb" />
                           </a>
                           <a className="link-btn" href={toApiFileUrl(b.poster_url)} target="_blank" rel="noopener noreferrer">
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
                            <button type="button" className="link-btn" onClick={() => openReport(b)}>
                              View report
                            </button>
                            <button type="button" className="link-btn" onClick={() => downloadReport(b)}>
                              Download report
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>No report</span>
                        )}

                        {canUploadReport(b) ? (
                          <div style={{ display: 'grid', gap: 6 }}>
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => handleReportFileChange(b.id, e.target.files?.[0])}
                            />
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => submitEventReport(b)}
                              disabled={!selectedReportFiles[b.id] || uploadingBookingId === b.id}
                              style={{ padding: '6px 10px', fontSize: 12 }}
                            >
                              {uploadingBookingId === b.id ? 'Uploading...' : 'Upload report'}
                            </button>
                          </div>
                        ) : b.status === 'approved' ? (
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>Upload enabled after event ends.</span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>Available only for approved events.</span>
                        )}
                      </div>
                     </td>
                    <td>
                      {b.status === 'pending' ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => cancelRequest(b)}
                          disabled={cancellingBookingId === b.id}
                          style={{ padding: '6px 10px', fontSize: 12 }}
                        >
                          {cancellingBookingId === b.id ? 'Cancelling...' : 'Cancel request'}
                        </button>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                    <td>{b.admin_note || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                    <td>{new Date(b.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
