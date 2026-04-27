import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getPendingBookings, getAnalytics, downloadActionLogs } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import '../Dashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';
  const [pending, setPending] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingLogs, setDownloadingLogs] = useState(false);

  const fetchDashboardData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [pendingRes, analyticsRes] = await Promise.all([getPendingBookings(), getAnalytics()]);
      setPending(pendingRes.data);
      setAnalytics(analyticsRes.data);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  useAutoRefresh(() => fetchDashboardData(false), 10000);

  const handleDownloadActionLogs = async () => {
    setDownloadingLogs(true);
    try {
      const res = await downloadActionLogs();
      const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `actions-${new Date().toISOString().slice(0, 10)}.log`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Action log downloaded.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to download action log.');
    } finally {
      setDownloadingLogs(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-page">
        <div className="page-header">
          <h2>Admin Dashboard 🛡️</h2>
          <p>Manage booking requests and monitor auditorium usage.</p>
        </div>

        {analytics && (
          <div className="stats-row">
            {analytics.totalByCollege.map((c) => (
              <div key={c.college_name} className="stat-card college-stat">
                <div className="stat-college-name">{c.college_name}</div>
                <div className="stat-mini-row">
                  <span className="mini pending">{c.pending} pending</span>
                  <span className="mini approved">{c.approved} approved</span>
                  <span className="mini rejected">{c.rejected} rejected</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="dashboard-actions">
          <Link to="/admin/requests" className="action-card primary">
            <span className="action-icon">📥</span>
            <div>
              <strong>Pending Requests</strong>
              <p>{pending.length} awaiting review</p>
            </div>
          </Link>
          <Link to="/admin/calendar" className="action-card">
            <span className="action-icon">📅</span>
            <div>
              <strong>Calendar View</strong>
              <p>All confirmed bookings</p>
            </div>
          </Link>
          <Link to="/admin/reports" className="action-card">
            <span className="action-icon">📊</span>
            <div>
              <strong>Reports</strong>
              <p>Export with filters</p>
            </div>
          </Link>
          {isSupervisor && (
            <button
              type="button"
              className="action-card action-card-button"
              onClick={handleDownloadActionLogs}
              disabled={downloadingLogs}
            >
              <span className="action-icon">🧾</span>
              <div>
                <strong>{downloadingLogs ? 'Downloading...' : 'Download Action Logs'}</strong>
                <p>Supervisor-only accountability log export</p>
              </div>
            </button>
          )}
        </div>

        <div className="recent-section">
          <h3>Pending Requests ({pending.length})</h3>
          {loading ? (
            <p>Loading...</p>
          ) : pending.length === 0 ? (
            <p className="empty-msg">No pending requests. ✅</p>
          ) : (
            <div className="table-card">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>College</th>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.college_name}</strong></td>
                      <td>{b.title}</td>
                      <td>{new Date(b.event_date).toLocaleDateString()}</td>
                      <td>{b.start_time} – {b.end_time}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>
                        <Link to={`/admin/requests`} className="link-btn">Review →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
