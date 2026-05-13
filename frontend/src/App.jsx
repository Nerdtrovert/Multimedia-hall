import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';
import PWAInstallButton from './components/common/PWAInstallButton';

import './App.css';

/* Lazy pages */
const Login = lazy(() => import('./pages/Login'));
const SupervisorLogin = lazy(() => import('./pages/SupervisorLogin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const Reports = lazy(() => import('./pages/Reports'));
const BookingFileAccess = lazy(() => import('./pages/BookingFileAccess'));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const NewBooking = lazy(() => import('./pages/user/NewBooking'));
const MyBookings = lazy(() => import('./pages/user/MyBookings'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const SupervisorDashboard = lazy(() => import('./pages/supervisor/SupervisorDashboard'));
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'));
const AllBookings = lazy(() => import('./pages/admin/AllBookings'));
const AboutDevelopers = lazy(() => import('./pages/AboutDevelopers'));

/* Smart redirect component */
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-screen">Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  const dashboardPathByRole = user.role === 'supervisor'
    ? '/supervisor/dashboard'
    : user.role === 'admin'
      ? '/admin/dashboard'
      : '/user/dashboard';

  return (
    <Navigate to={dashboardPathByRole} replace />
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <main className="app-main">
            <Suspense fallback={<div className="loading-screen">Loading...</div>}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } />
                  
                <Route path="/_maintenance/supervisor-access-portal" element={<SupervisorLogin />} />
                <Route path="/supervisor-login" element={<Navigate to="/_maintenance/supervisor-access-portal" replace />} />
                <Route path="/supervisor-login/*" element={<Navigate to="/_maintenance/supervisor-access-portal" replace />} />
                <Route path="/supervisor-access" element={<Navigate to="/_maintenance/supervisor-access-portal" replace />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/about" element={<AboutDevelopers />} />
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
                <Route path="/files/bookings/:bookingId/:fileType" element={<BookingFileAccess />} />
                <Route path="/user/change-password" element={
                  <ProtectedRoute role="college"><ChangePassword /></ProtectedRoute>
                } />

                {/* ADMIN */}
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
                } />
                <Route path="/admin/requests" element={
                  <ProtectedRoute role="admin"><AdminRequests /></ProtectedRoute>
                } />
                <Route path="/admin/all-bookings" element={
                  <ProtectedRoute role="admin"><AllBookings /></ProtectedRoute>
                } />
                <Route path="/admin/calendar" element={
                  <ProtectedRoute role="admin"><CalendarView /></ProtectedRoute>
                } />
                <Route path="/admin/reports" element={
                  <ProtectedRoute role="admin"><Reports /></ProtectedRoute>
                } />
                <Route path="/admin/change-password" element={
                  <ProtectedRoute role="admin"><ChangePassword /></ProtectedRoute>
                } />

                {/* SUPERVISOR */}
                <Route path="/supervisor/dashboard" element={
                  <ProtectedRoute role="supervisor"><SupervisorDashboard /></ProtectedRoute>
                } />
                <Route path="/supervisor/calendar" element={
                  <ProtectedRoute role="supervisor"><CalendarView /></ProtectedRoute>
                } />
                <Route path="/supervisor/reports" element={
                  <ProtectedRoute role="supervisor"><Reports /></ProtectedRoute>
                } />
                <Route path="/supervisor/change-password" element={
                  <ProtectedRoute role="supervisor"><ChangePassword /></ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<HomeRedirect />} />

              </Routes>
            </Suspense>
          </main>

          <footer className="app-footer">
            <div className="app-footer-left">© <strong>Copyright</strong> BV Jagadeesh Multimedia Hall</div>
            <div className="app-footer-right">
              Design and Developed by <Link to="/about">About</Link>
            </div>
          </footer>
        </div>

        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
          theme="light"
        />

        <PWAInstallButton />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
