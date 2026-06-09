import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const dashboardPathByRole = user?.role === 'supervisor'
    ? '/supervisor/dashboard'
    : user?.role === 'admin'
      ? '/admin/dashboard'
      : '/user/dashboard';

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  // If already logged in → redirect
  if (user) {
    return (
      <Navigate
        to={dashboardPathByRole}
        replace
      />
    );
  }

  return children;
};

export default PublicRoute;
