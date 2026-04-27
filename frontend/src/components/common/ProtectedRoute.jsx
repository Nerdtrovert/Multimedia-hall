import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const allowedRoles = Array.isArray(role) ? role : role ? [role] : [];
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const fallback = ['admin', 'supervisor'].includes(user.role) ? '/admin/dashboard' : '/user/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default ProtectedRoute;
