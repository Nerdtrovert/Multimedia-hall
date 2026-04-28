import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = ['admin', 'supervisor'].includes(user?.role);
  const base = isAdmin ? '/admin' : '/user';

  return (
    <nav className={`navbar ${menuOpen ? 'open' : ''}`}>
      <div className="navbar-top">
        <div className="navbar-brand">
          <img src="/logo.png" alt="Logo" className="navbar-logo" />
          <span className="navbar-title">B V Jagadish Multimedia Hall</span>
        </div>
        <button
          type="button"
          className="navbar-menu-toggle"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      <div className={`navbar-links ${menuOpen ? 'show' : ''}`}>
        <NavLink to={`${base}/dashboard`} className={({ isActive }) => (isActive ? 'active' : '')}>
          Dashboard
        </NavLink>

        <NavLink to={`${base}/calendar`} className={({ isActive }) => (isActive ? 'active' : '')}>
          Calendar
        </NavLink>

        {!isAdmin && (
          <NavLink to="/user/new-booking" className={({ isActive }) => (isActive ? 'active' : '')}>
            New Booking
          </NavLink>
        )}

        {!isAdmin && (
          <NavLink to="/user/my-bookings" className={({ isActive }) => (isActive ? 'active' : '')}>
            My Bookings
          </NavLink>
        )}

        {isAdmin && (
          <NavLink to="/admin/requests" className={({ isActive }) => (isActive ? 'active' : '')}>
            Requests
          </NavLink>
        )}

        {isAdmin && (
          <NavLink to="/admin/all-bookings" className={({ isActive }) => (isActive ? 'active' : '')}>
            All Bookings
          </NavLink>
        )}

        <NavLink to={`${base}/reports`} className={({ isActive }) => (isActive ? 'active' : '')}>
          Reports
        </NavLink>

        <NavLink
          to={`${base}/change-password`}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          Change Password
        </NavLink>
      </div>
      <div className={`navbar-user ${menuOpen ? 'show' : ''}`}>
        <span className="user-info">
          <span className={`role-badge ${isAdmin ? 'admin' : 'college'}`}>
            {isAdmin ? (user?.role === 'supervisor' ? 'Supervisor' : 'Admin') : user?.college_name}
          </span>
          {user?.name}
        </span>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
