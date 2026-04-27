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

  // Only display if the user is logged in
  if (!user) return null; 

  return (
    <header className="navbar-container">
      {/* SECTION 1: TOP BRANDING BANNER */}
      <div className="branding-header">
        
        {/* Layer 1: Navy Strip with ERP Login */}
        <div className="navy-strip">
          <p>The National Education Society of Karnataka (Regd.), Bengaluru 560004</p>
          <p>CET Code : E305 | COMED-K Code : E045</p>
          {/* Note: Social media icons removed from here */}
          
        </div>

        {/* Layer 2: Main Logo and Address Section */}
        <div className="logo-address-banner">
          
          {/* LEFT: College Logo */}
          <div className="logo-group">
             <img src="/assets/college-logo.png" alt="College Seal" className="college-logo" />
             {/* <p className="estd-text">Estd. : 2024</p> */}
          </div>

          {/* CENTER: Title and Affiliations */}
          <div className="center-text-group">
            <h1>Dr. H N National College of Engineering</h1>
            <p className="affiliation-text">
              Approved by All India Council for Technical Education (AICTE), Govt. of India 
              and affiliated to Visvesvaraya Technological University (VTU)
            </p>
            <p className="address-text">36B Cross, Jayanagar 7th block, Bengaluru – 560070</p>
          </div>

          {/* RIGHT: Founder Image and Caption */}
          <div className="founder-group">
            <img 
              src="/assets/founder.png" 
              alt="Dr. H Narasimhaiah" 
              className="founder-image" 
            />
            <div className="founder-caption">
                <p>Dr H Narasimhaiah</p>
                <p className="award-text">Padma Bhushan</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: GENERIC NAVIGATION LINKS (Blue Strip) */}
      <nav className="nav-links-bar">
        <div className="links-left">
          <Link to={`${base}/dashboard`}>Dashboard</Link>
          <Link to={`${base}/calendar`}>Calendar</Link>
          {!isAdmin && <Link to="/user/new-booking">New Booking</Link>}
          {isAdmin && <Link to="/admin/requests">Requests</Link>}
          <Link to={`${base}/reports`}>Reports</Link>
        </div>

        <div className="links-right">
          <span className="welcome-username">Welcome, {user?.name}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;