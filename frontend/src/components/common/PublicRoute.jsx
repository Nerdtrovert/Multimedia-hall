import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  const isAdminLikeRole = ['admin', 'supervisor'].includes(user?.role);

  // If already logged in → redirect
  if (user) {
    return (
      <Navigate
        to={isAdminLikeRole ? '/admin/dashboard' : '/user/dashboard'}
        replace
      />
    );
  }

  return children;
};

export default PublicRoute;
