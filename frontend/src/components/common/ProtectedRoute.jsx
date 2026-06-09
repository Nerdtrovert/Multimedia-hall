import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  const dashboardPathByRole = (currentUser) =>
    currentUser?.role === 'supervisor'
      ? '/supervisor/dashboard'
      : currentUser?.role === 'admin'
        ? '/admin/dashboard'
        : '/user/dashboard';

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const allowedRoles = Array.isArray(role) ? role : role ? [role] : [];
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={dashboardPathByRole(user)} replace />;
  }

  return children;
};

export default ProtectedRoute;
