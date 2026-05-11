import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  clearActionLogs,
  downloadActionLogs,
  getSupervisorResetTargets,
  supervisorResetOperationalData,
  supervisorResetUserEmail,
} from '../../utils/api';
import Navbar from '../../components/common/Navbar';
import '../Dashboard.css';

const SupervisorDashboard = () => {
  const [downloadingLogs, setDownloadingLogs] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);
  const [emailResetForm, setEmailResetForm] = useState({ username: '', email: '' });
  const [resetTargets, setResetTargets] = useState([]);
  const [totalUsers, setTotalUsers] = useState(null);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  useEffect(() => {
    const fetchResetTargets = async () => {
      try {
        const response = await getSupervisorResetTargets();
        const payload = response?.data;
        const rawTargets = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.users)
            ? payload.users
            : Array.isArray(payload?.targets)
              ? payload.targets
              : [];

        const normalizedTargets = rawTargets
          .map((target) => {
            if (typeof target === 'string') {
              const username = target.trim();
              return username ? { username, email: '' } : null;
            }

            const username = String(
              target?.username ?? target?.userName ?? target?.user_name ?? ''
            ).trim();
            const email = String(target?.email ?? '').trim();
            const role = String(target?.role ?? '').trim();
            const label = String(target?.label ?? '').trim();
            return username ? { username, email, role, label } : null;
          })
          .filter(Boolean)
          .sort((a, b) => {
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (a.role !== 'admin' && b.role === 'admin') return 1;
            return a.username.localeCompare(b.username, undefined, { sensitivity: 'base' });
          });

        setResetTargets(normalizedTargets);
        setTotalUsers(typeof payload?.totalUsers === 'number' ? payload.totalUsers : null);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Unable to load usernames for reset.');
      }
    };

    fetchResetTargets();
  }, []);

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

  const handleClearActionLogs = async () => {
    const confirmed = window.confirm('This will permanently clear the action log file. Continue?');
    if (!confirmed) return;

    setClearingLogs(true);
    try {
      const response = await clearActionLogs();
      toast.success(response.data?.message || 'Action logs cleared.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to clear action logs.');
    } finally {
      setClearingLogs(false);
    }
  };

  const handleSupervisorDbReset = async () => {
    const confirmed = window.confirm(
      'This will permanently clear bookings, reports, logs, and other runtime data. Users will be preserved. Continue?'
    );
    if (!confirmed) return;

    setResettingDb(true);
    try {
      const response = await supervisorResetOperationalData();
      toast.success(response.data?.message || 'Operational data reset complete.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to reset operational data.');
    } finally {
      setResettingDb(false);
    }
  };

  const handleSupervisorEmailReset = async (event) => {
    event.preventDefault();
    setUpdatingEmail(true);
    try {
      const response = await supervisorResetUserEmail(emailResetForm.username, emailResetForm.email);
      toast.success(response.data?.message || 'Temporary password issued successfully.');
      setResetTargets((prev) =>
        prev.map((target) =>
          target.username === emailResetForm.username
            ? { ...target, email: emailResetForm.email.trim() }
            : target
        )
      );
      setEmailResetForm({ username: '', email: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to update user email.');
    } finally {
      setUpdatingEmail(false);
    }
  };

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
                {resetTargets.length > 0 ? 'Select account' : 'No accounts available'}
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
