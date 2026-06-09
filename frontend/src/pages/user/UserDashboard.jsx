import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyBookings, getCalendarBookings } from '../../utils/api';
import Navbar from '../../components/common/Navbar';
import AnnouncementsSection from '../../components/common/RecentActivitySection';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { getAnnouncementCards } from '../../utils/recentActivity';
import '../Dashboard.css';

const UserDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [commonBookings, setCommonBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split('T')[0];
      
      const [myRes, calendarRes] = await Promise.all([
        getMyBookings(),
        getCalendarBookings(start, end),
      ]);
      setBookings(myRes.data);
      setCommonBookings(calendarRes.data || []);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useAutoRefresh(() => fetchBookings(false), 10000);

  const bookingSummary = useMemo(
    () =>
      bookings.reduce(
        (summary, booking) => {
          if (booking.status === 'pending') summary.pending += 1;
          if (['approved', 'concluded'].includes(booking.status)) summary.approved += 1;
          if (booking.status === 'rejected') summary.rejected += 1;
          return summary;
        },
        { pending: 0, approved: 0, rejected: 0 },
      ),
    [bookings],
  );

  const recentActivity = useMemo(
    () => getAnnouncementCards(commonBookings),
    [commonBookings],
  );

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
            <div className="stat-number pending">{bookingSummary.pending}</div>
            <div className="stat-label">Pending</div>
          </div>

          <div className="stat-card card user-stat-card approved">
            <div className="stat-number approved">{bookingSummary.approved}</div>
            <div className="stat-label">Approved</div>
          </div>

          <div className="stat-card card user-stat-card rejected">
            <div className="stat-number rejected">{bookingSummary.rejected}</div>
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

        <AnnouncementsSection
          bookings={recentActivity.all}
          loading={loading}
          emptyMessage={
            <>
              No announcements right now. <Link to="/user/new-booking">Create one →</Link>
            </>
          }
        />

      </div>
    </div>
  );
};

export default UserDashboard;
