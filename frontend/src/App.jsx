import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute'; 

import './App.css';

const isAdminLikeRole = (role) => ['admin', 'supervisor'].includes(role);

/* Lazy pages */
const Login = lazy(() => import('./pages/Login'));
const SupervisorLogin = lazy(() => import('./pages/SupervisorLogin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const Reports = lazy(() => import('./pages/Reports'));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const NewBooking = lazy(() => import('./pages/user/NewBooking'));
const MyBookings = lazy(() => import('./pages/user/MyBookings'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'));
const AllBookings = lazy(() => import('./pages/admin/AllBookings'));

/* Smart redirect component */
const HomeRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Navigate
      to={isAdminLikeRole(user.role) ? '/admin/dashboard' : '/user/dashboard'}
      replace
    />
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="loading-screen">Loading...</div>}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
              
            <Route path="/_maintenance/supervisor-access-portal" element={<SupervisorLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<HomeRedirect />} />
            {/* USER */}
            <Route path="/user/dashboard" element={
              <ProtectedRoute role="college"><UserDashboard /></ProtectedRoute>
            } />
            <Route path="/user/new-booking" element={
              <ProtectedRoute role="college"><NewBooking /></ProtectedRoute>
            } />
            <Route path="/user/my-bookings" element={
              <ProtectedRoute role="college"><MyBookings /></ProtectedRoute>
            } />
            <Route path="/user/calendar" element={
              <ProtectedRoute role="college"><CalendarView /></ProtectedRoute>
            } />
            <Route path="/user/reports" element={
              <ProtectedRoute role="college"><Reports /></ProtectedRoute>
            } />
            <Route path="/user/change-password" element={
              <ProtectedRoute role="college"><ChangePassword /></ProtectedRoute>
            } />

            {/* ADMIN */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute role={['admin', 'supervisor']}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/requests" element={
              <ProtectedRoute role={['admin', 'supervisor']}><AdminRequests /></ProtectedRoute>
            } />
            <Route path="/admin/all-bookings" element={
              <ProtectedRoute role={['admin', 'supervisor']}><AllBookings /></ProtectedRoute>
            } />
            <Route path="/admin/calendar" element={
              <ProtectedRoute role={['admin', 'supervisor']}><CalendarView /></ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute role={['admin', 'supervisor']}><Reports /></ProtectedRoute>
            } />
            <Route path="/admin/change-password" element={
              <ProtectedRoute role={['admin', 'supervisor']}><ChangePassword /></ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<HomeRedirect />} />

          </Routes>
        </Suspense>

        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
          theme="light"
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
