import { useState } from 'react';
import { toast } from 'react-toastify';
import Navbar from '../components/common/Navbar';
import PageBackButton from '../components/common/PageBackButton';
import { changePassword } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './ChangePassword.css';

const ChangePassword = () => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'supervisor'].includes(user?.role);
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
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

  return (
    <div>
      <Navbar />
      <div className="change-password-page">
        <PageBackButton fallback={isAdmin ? '/admin/dashboard' : '/user/dashboard'} />
        <div className="change-password-card">
          <h2>Change Password</h2>
          <p>Enter your current password and set a new one.</p>

          <form onSubmit={handleSubmit} className="change-password-form">
            <div className="form-group">
              <label>Old Password</label>
              <input
                type="password"
                value={form.oldPassword}
                onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                minLength={8}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                minLength={8}
                required
              />
            </div>

            <button type="submit" className="change-password-btn" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
