import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = await login(form.email, form.password);

      toast.success(`Welcome, ${userData.name}!`);

      if (['admin', 'supervisor'].includes(userData.role)) {
        navigate('/admin/dashboard');
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
          style={{ backgroundImage: "url('/bg.jpeg')" }}
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
                <input
                  className="form-input"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={{ textAlign: 'right', marginTop: '6px' }}>
                <a href="/forgot-password" className="forgot-password-link">
                  Forgot password?
                </a>
              </div>

              <button className="submit-btn" disabled={loading}>
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </div>

          <div className="card-footer">
            <p>
              Need help?{' '}
              <a href="#" className="contact-link">
                Contact admin
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="page-footer">
        <p>© 2026 Auditorium Booking System</p>
      </div>
    </div>
  );
};

export default Login;