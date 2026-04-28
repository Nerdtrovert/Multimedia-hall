import { useAuth } from '../../context/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = ['admin', 'supervisor'].includes(user?.role);
  const base = isAdmin ? '/admin' : '/user';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src="/logo.png" alt="Logo" className="nav-logo" />
        <span className="navbar-title">B V Jagadish Multimedia Hall</span>
      </div>
      <div className="navbar-links">
      <NavLink to={`${base}/dashboard`} className={({ isActive }) => isActive ? "active" : ""}>
        Dashboard
      </NavLink>

      <NavLink to={`${base}/calendar`} className={({ isActive }) => isActive ? "active" : ""}>
        Calendar
      </NavLink>

      {!isAdmin && (
        <NavLink to="/user/new-booking" className={({ isActive }) => isActive ? "active" : ""}>
          New Booking
        </NavLink>
      )}

      {!isAdmin && (
        <NavLink to="/user/my-bookings" className={({ isActive }) => isActive ? "active" : ""}>
          My Bookings
        </NavLink>
      )}

      {isAdmin && (
        <NavLink to="/admin/requests" className={({ isActive }) => isActive ? "active" : ""}>
          Requests
        </NavLink>
      )}

      {isAdmin && (
        <NavLink to="/admin/all-bookings" className={({ isActive }) => isActive ? "active" : ""}>
          All Bookings
        </NavLink>
      )}

      <NavLink to={`${base}/reports`} className={({ isActive }) => isActive ? "active" : ""}>
        Reports
      </NavLink>

      <NavLink to={`${base}/change-password`} className={({ isActive }) => isActive ? "active" : ""}>
        Change Password
      </NavLink>
      </div>
      <div className="navbar-user">
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
