import { useCallback, useEffect, useState } from 'react';
import { deleteMyBooking, getMyBookings } from '../../utils/api';
import { toast } from 'react-toastify';
import Navbar from '../../components/common/Navbar';
import PageBackButton from '../../components/common/PageBackButton';
import StatusBadge from '../../components/common/StatusBadge';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import '../Dashboard.css';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

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

  const handleDelete = async (booking) => {
    if (!booking) return;

    const ok = window.confirm(`Delete booking request "${booking.title}"?`);
    if (!ok) return;

    setDeletingId(booking.id);
    try {
      await deleteMyBooking(booking.id);
      toast.success('Booking deleted.');
      fetchBookings(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally {
      setDeletingId(null);
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
                  <th>Admin Note</th>
                  <th>Submitted</th>
                  <th>Action</th>
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
                    <td>{b.admin_note || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                    <td>{new Date(b.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-secondary"
                        onClick={() => handleDelete(b)}
                        disabled={deletingId === b.id}
                        style={{ padding: '6px 10px', fontSize: 12 }}
                      >
                        {deletingId === b.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
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
