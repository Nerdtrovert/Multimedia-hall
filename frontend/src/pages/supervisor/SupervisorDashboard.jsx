import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import { useSupervisorMaintenance } from '../../hooks/useSupervisorMaintenance';
import '../Dashboard.css';

const SupervisorDashboard = () => {
  const {
    downloadingLogs,
    clearingLogs,
    resettingDb,
    emailResetForm,
    setEmailResetForm,
    resetTargets,
    totalUsers,
    updatingEmail,
    handleDownloadActionLogs,
    handleClearActionLogs,
    handleSupervisorDbReset,
    handleSupervisorEmailReset,
  } = useSupervisorMaintenance({
    prioritizeAdmins: true,
  });

  const accountPlaceholder = useMemo(
    () => (resetTargets.length > 0 ? 'Select account' : 'No accounts available'),
    [resetTargets.length],
  );

  return (
    <div>
      <Navbar />
      <div className="dashboard-page">
        <div className="page-header">
          <h2>Supervisor Dashboard 🛠️</h2>
          <p>Maintenance controls and account recovery tools.</p>
        </div>

        <div className="dashboard-actions">
          <Link to="/supervisor/calendar" className="action-card">
            <span className="action-icon">📅</span>
            <div>
              <strong>Calendar View</strong>
              <p>All confirmed bookings</p>
            </div>
          </Link>
          <Link to="/supervisor/reports" className="action-card">
            <span className="action-icon">📊</span>
            <div>
              <strong>Reports</strong>
              <p>Export with filters</p>
            </div>
          </Link>
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
          <button
            type="button"
            className="action-card action-card-button danger"
            onClick={handleClearActionLogs}
            disabled={clearingLogs}
          >
            <span className="action-icon">🧹</span>
            <div>
              <strong>{clearingLogs ? 'Clearing...' : 'Clear Action Logs'}</strong>
              <p>Supervisor-only cleanup of actions.log</p>
            </div>
          </button>
          <button
            type="button"
            className="action-card action-card-button danger"
            onClick={handleSupervisorDbReset}
            disabled={resettingDb}
          >
            <span className="action-icon">🗑️</span>
            <div>
              <strong>{resettingDb ? 'Resetting...' : 'Reset DB (Keep Users)'}</strong>
              <p>Supervisor-only truncate of all non-user tables</p>
            </div>
          </button>
        </div>

        {totalUsers !== null && (
          <div className="stats-row">
            <div className="stat-card card user-stat-card total">
              <div className="stat-number total">{totalUsers}</div>
              <div className="stat-label">Users in table</div>
            </div>
          </div>
        )}

        <section className="recent-section supervisor-tools">
          <h3>Supervisor User Email Reset</h3>
          <p className="supervisor-tools-note">
            Select a college account or the NES admin, then enter the email that should receive the temporary password.
          </p>
          <form className="filter-form" onSubmit={handleSupervisorEmailReset}>
            <select
              className="input"
              value={emailResetForm.username}
              onChange={(event) =>
                setEmailResetForm((prev) => ({
                  ...prev,
                  username: event.target.value,
                  email:
                    resetTargets.find((target) => target.username === event.target.value)?.email || prev.email,
                }))
              }
              required
            >
              <option value="" disabled>
                {accountPlaceholder}
              </option>
              {resetTargets.map((target) => (
                <option key={target.username} value={target.username}>
                  {target.label || (target.role === 'admin' ? 'NES Admin' : target.username)}
                  {target.role === 'admin' ? ` (${target.username})` : ''}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="email"
              placeholder="current-or-new-email@domain.com"
              value={emailResetForm.email}
              onChange={(event) =>
                setEmailResetForm((prev) => ({ ...prev, email: event.target.value }))
              }
              required
            />
            <button type="submit" className="btn btn-primary" disabled={updatingEmail}>
              {updatingEmail ? 'Sending...' : 'Send Temporary Password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
