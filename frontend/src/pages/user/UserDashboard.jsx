import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyBookings } from '../../utils/api';
import Navbar from '../../components/common/Navbar';
import RecentActivitySection from '../../components/common/RecentActivitySection';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { getRecentApprovedBookings } from '../../utils/recentActivity';
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
  const recentActivity = getRecentApprovedBookings(bookings);

  return (
    <div>
      <Navbar />

      <div className="dashboard-page">
        <div className="page-header">
          <h2>Welcome, {user?.name} 👋</h2>
          <p>{user?.college_name} — B V Jagadish Multimedia Hall</p>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card card user-stat-card total">
            <div className="stat-number total">{bookings.length}</div>
            <div className="stat-label">Total Requests</div>
          </div>

          <div className="stat-card card user-stat-card pending">
            <div className="stat-number pending">{pending}</div>
            <div className="stat-label">Pending</div>
          </div>

          <div className="stat-card card user-stat-card approved">
            <div className="stat-number approved">{approved}</div>
            <div className="stat-label">Approved</div>
          </div>

          <div className="stat-card card user-stat-card rejected">
            <div className="stat-number rejected">{rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>

        {/* Actions */}
        <div className="dashboard-actions">
          <Link to="/user/new-booking" className="card card-hover action-card primary">
            <span className="action-icon">📋</span>
            <div>
              <strong>New Booking Request</strong>
              <p>Submit a request for the auditorium</p>
            </div>
          </Link>

          <Link to="/user/calendar" className="card card-hover action-card">
            <span className="action-icon">📅</span>
            <div>
              <strong>View Calendar</strong>
              <p>See all approved bookings</p>
            </div>
          </Link>

          <Link to="/user/reports" className="card card-hover action-card">
            <span className="action-icon">📊</span>
            <div>
              <strong>My Reports</strong>
              <p>Download your booking history</p>
            </div>
          </Link>
        </div>

        <RecentActivitySection
          bookings={recentActivity}
          loading={loading}
          emptyMessage={
            <>
              No recent approved activity right now. <Link to="/user/new-booking">Create one →</Link>
            </>
          }
        />

      </div>
    </div>
  );
};

export default UserDashboard;
