import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Bookings - College
export const submitBooking = (data) => api.post('/bookings', data);
export const getMyBookings = () => api.get('/bookings/my');
export const deleteMyBooking = (id) => api.delete(`/bookings/${id}`);

// Bookings - Common
export const getCalendarBookings = (start, end) =>
  api.get('/bookings/calendar', {
    params: { start, end },
  });
// Bookings - Admin
export const getAllBookings = (params) => api.get('/bookings', { params });
export const getPendingBookings = () => api.get('/bookings/pending');
export const updateBookingStatus = (id, status, admin_note) =>
  api.patch(`/bookings/${id}/status`, { status, admin_note });

// Reports
export const downloadPDF = (params) =>
  api.get('/reports/pdf', { params, responseType: 'blob' });
export const downloadExcel = (params) =>
  api.get('/reports/excel', { params, responseType: 'blob' });
export const getAnalytics = () => api.get('/reports/analytics');

export default api;
