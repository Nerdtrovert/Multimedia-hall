import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { forgotPassword } from '../utils/api';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      toast.success(res.data?.message || 'If the email exists, a temporary password has been sent.');
      setEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to process password reset right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <div className="forgot-password-icon">🔐</div>
          <h1>Forgot Password</h1>
          <p>We will send a temporary password to your registered email.</p>
        </div>

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-forgot-password" disabled={loading}>
            {loading ? 'Sending...' : 'Send Temporary Password'}
          </button>
        </form>

        <Link to="/login" className="forgot-password-back-link">
          ← Back to login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
