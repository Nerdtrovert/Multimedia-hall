import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
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
        <span className="navbar-icon">🏛️</span>
        <span className="navbar-title">Auditorium Booking</span>
      </div>

      <div className="navbar-links">
        <Link to={`${base}/dashboard`}>Dashboard</Link>
        <Link to={`${base}/calendar`}>Calendar</Link>
        {!isAdmin && <Link to="/user/new-booking">New Booking</Link>}
        {!isAdmin && <Link to="/user/my-bookings">My Bookings</Link>}
        {isAdmin && <Link to="/admin/requests">Requests</Link>}
        {isAdmin && <Link to="/admin/all-bookings">All Bookings</Link>}
        <Link to={`${base}/reports`}>Reports</Link>
        <Link to={`${base}/change-password`}>Change Password</Link>
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
