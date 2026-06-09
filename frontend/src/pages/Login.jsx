import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Login.css';

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

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = await login(form.email, form.password, form.rememberMe);

      toast.success(`Welcome, ${userData.name}!`);

      if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (userData.role === 'supervisor') {
        navigate('/supervisor/dashboard');
      } else {
        navigate('/user/dashboard');
      }

    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">

      {/* Announcement */}
      <div className="announcement-bar">
        Auditorium Booking Portal
      </div>

      {/* Header */}
      <div className="main-header">
        <div className="header-content">
          <img src="/logo.png" alt="Logo" className="logo-image" />
          <h1 className="header-title">B V Jagadish Multimedia Hall</h1>
        </div>
      </div>

      <div className="main-content">

        {/* Background */}
        <div
          className="bg-image"
          style={{ backgroundImage: "url('/bg.jpg')" }}
        />

        {/* Card */}
        <div className="login-card">
          <div className="card-body">

            <div className="card-header-text">
              <h2 className="card-title">Sign in</h2>
              <p className="card-subtitle">
                Enter your credentials to continue
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  className="form-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="password-input-wrap">
                  <input
                    className="form-input password-input"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    <PasswordToggleIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              <label className="remember-me-row">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={form.rememberMe}
                  onChange={handleChange}
                />
                <span>Remember me</span>
              </label>

              <div style={{ textAlign: 'right', marginTop: '6px' }}>
                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot password?
                </Link>
              </div>
              <button className="submit-btn" disabled={loading}>
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;
