import { useCallback, useEffect, useState } from 'react';
import { getPendingBookings, updateBookingStatus } from '../../utils/api';
import { toast } from 'react-toastify';
import Navbar from '../../components/common/Navbar';
import PageBackButton from '../../components/common/PageBackButton';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import '../Dashboard.css';
import './AdminRequests.css';

const AdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { booking, action }
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const assetBase = apiBase.replace(/\/api\/?$/, '');

  const fetchPending = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await getPendingBookings();
      setRequests(res.data);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);
  useAutoRefresh(() => fetchPending(false), 10000, !modal && !submitting);

  const openModal = (booking, action) => {
    setModal({ booking, action });
    setNote('');
  };

  const handleDecision = async () => {
    if (!modal) return;
    setSubmitting(true);
    try {
      await updateBookingStatus(modal.booking.id, modal.action, note);
      toast.success(`Booking ${modal.action} successfully. Email sent to college.`);
      setModal(null);
      fetchPending(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-page">
        <PageBackButton fallback="/admin/dashboard" />
        <div className="page-header">
          <h2>Pending Requests</h2>
          <p>Review and approve or reject booking requests from colleges.</p>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>All caught up!</h3>
            <p>No pending requests at the moment.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {requests.map((b) => (
              <div key={b.id} className="request-card">
                <div className="request-header">
                  <span className="college-tag">{b.college_name}</span>
                  <span className="submitted-date">
                    Submitted {new Date(b.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="request-title">{b.title}</h3>

                {(b.poster_url || b.attachment_url) && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {b.poster_url && (
                      <a href={`${assetBase}${b.poster_url}`} target="_blank" rel="noreferrer">
                        <img
                          src={`${assetBase}${b.poster_url}`}
                          alt="Event poster"
                          style={{
                            width: 120,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 10,
                            border: '1px solid #e5e7eb',
                          }}
                        />
                      </a>
                    )}
                    {b.attachment_url && (
                      <a
                        href={`${assetBase}${b.attachment_url}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 13, fontWeight: 600, color: '#2d6a9f' }}
                      >
                        View PDF
                      </a>
                    )}
                  </div>
                )}
                {b.purpose && <p className="request-purpose">{b.purpose}</p>}
                <div className="request-meta">
                  <span>📅 {new Date(b.event_date).toDateString()}</span>
                  <span>🕐 {b.start_time} – {b.end_time}</span>
                </div>
                <div className="request-actions">
                  <button className="btn-approve" onClick={() => openModal(b, 'approved')}>
                    ✓ Approve
                  </button>
                  <button className="btn-reject" onClick={() => openModal(b, 'rejected')}>
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="decision-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modal.action === 'approved' ? '✅ Approve' : '❌ Reject'} Booking
            </h3>
            <p>
              <strong>{modal.booking.title}</strong> —{' '}
              {new Date(modal.booking.event_date).toDateString()}
            </p>
            <div className="form-group">
              <label>Optional Note to College</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  modal.action === 'rejected'
                    ? 'Reason for rejection...'
                    : 'Any instructions for the college...'
                }
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className={modal.action === 'approved' ? 'btn-approve' : 'btn-reject'}
                onClick={handleDecision}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : `Confirm ${modal.action === 'approved' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRequests;
