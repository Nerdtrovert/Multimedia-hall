import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyBookings } from '../../utils/api';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import '../Dashboard.css';

const UserDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await getMyBookings();
      setBookings(res.data);
    } catch {
      return;
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);
  useAutoRefresh(() => fetchBookings(false), 10000);

  const pending = bookings.filter((b) => b.status === 'pending').length;
  const approved = bookings.filter((b) => b.status === 'approved').length;
  const rejected = bookings.filter((b) => b.status === 'rejected').length;
  const recent = bookings.slice(0, 5);

  return (
    <div>
      <Navbar />
      <div className="dashboard-page">
        <div className="page-header">
          <h2>Welcome, {user?.name} 👋</h2>
          <p>{user?.college_name} — Auditorium Booking Portal</p>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-number total">{bookings.length}</div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-number pending">{pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-number approved">{approved}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-number rejected">{rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>

        <div className="dashboard-actions">
          <Link to="/user/new-booking" className="action-card primary">
            <span className="action-icon">📋</span>
            <div>
              <strong>New Booking Request</strong>
              <p>Submit a request for the auditorium</p>
            </div>
          </Link>
          <Link to="/user/calendar" className="action-card">
            <span className="action-icon">📅</span>
            <div>
              <strong>View Calendar</strong>
              <p>See all approved bookings</p>
            </div>
          </Link>
          <Link to="/user/reports" className="action-card">
            <span className="action-icon">📊</span>
            <div>
              <strong>My Reports</strong>
              <p>Download your booking history</p>
            </div>
          </Link>
        </div>

        <div className="recent-section">
          <h3>Recent Requests</h3>
          {loading ? (
            <p>Loading...</p>
          ) : recent.length === 0 ? (
            <p className="empty-msg">No booking requests yet. <Link to="/user/new-booking">Create one →</Link></p>
          ) : (
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((b) => (
                  <tr key={b.id}>
                    <td>{b.title}</td>
                    <td>{new Date(b.event_date).toLocaleDateString()}</td>
                    <td>{b.start_time} – {b.end_time}</td>
                    <td><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
