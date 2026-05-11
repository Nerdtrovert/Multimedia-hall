import { useState } from 'react';
import { toast } from 'react-toastify';
import Navbar from '../components/common/Navbar';
import PageBackButton from '../components/common/PageBackButton';
import { changePassword } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './ChangePassword.css';

const PasswordToggleIcon = ({ visible }) => (
  visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5c1.3 0 2.5.2 3.6.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M21.5 12s-3.5 6.5-9.5 6.5c-1.3 0-2.5-.2-3.6-.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
);

const ChangePassword = () => {
  const { user } = useAuth();
  const dashboardFallback = user?.role === 'supervisor'
    ? '/supervisor/dashboard'
    : user?.role === 'admin'
      ? '/admin/dashboard'
      : '/user/dashboard';
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const passwordsMatch = form.newPassword === form.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwordsMatch) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(form.oldPassword, form.newPassword);
      toast.success(res.data?.message || 'Password changed successfully.');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to change password right now.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  return (
    <div>
      <Navbar />
      <div className="change-password-page">
        <PageBackButton fallback={dashboardFallback} />
        <div className="change-password-card">
          <h2>Change Password</h2>
          <p>Enter your current password and set a new one.</p>

          <form onSubmit={handleSubmit} className="change-password-form">
            <div className="form-group">
              <label>Old Password</label>
              <div className="password-field">
                <input
                  type={showPassword.oldPassword ? 'text' : 'password'}
                  value={form.oldPassword}
                  onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => togglePasswordVisibility('oldPassword')}
                  aria-label={showPassword.oldPassword ? 'Hide old password' : 'Show old password'}
                  aria-pressed={showPassword.oldPassword}
                >
                  <PasswordToggleIcon visible={showPassword.oldPassword} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div className="password-field">
                <input
                  type={showPassword.newPassword ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => togglePasswordVisibility('newPassword')}
                  aria-label={showPassword.newPassword ? 'Hide new password' : 'Show new password'}
                  aria-pressed={showPassword.newPassword}
                >
                  <PasswordToggleIcon visible={showPassword.newPassword} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="password-field">
                <input
                  type={showPassword.confirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  aria-label={showPassword.confirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showPassword.confirmPassword}
                >
                  <PasswordToggleIcon visible={showPassword.confirmPassword} />
                </button>
              </div>
              {form.confirmPassword && !passwordsMatch && (
                <span className="field-error">Passwords do not match.</span>
              )}
            </div>

            <button
              type="submit"
              className="change-password-btn"
              disabled={loading || (form.newPassword && form.confirmPassword && !passwordsMatch)}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
