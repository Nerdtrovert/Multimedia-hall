import { Link } from 'react-router-dom';
import '../../pages/Login.css';

const AuthForm = ({
  icon,
  title,
  subtitle,
  emailPlaceholder = "your@email.com",
  loading,
  onSubmit,
  form,
  setForm,
  forgotPasswordLink,
}) => {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">{icon}</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder={emailPlaceholder}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {forgotPasswordLink && (
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot password?
            </Link>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthForm;
