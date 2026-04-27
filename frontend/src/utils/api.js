import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

const resolveApiOrigin = () => {
  const configuredBase = import.meta.env.VITE_API_BASE_URL || '/api';
  if (/^https?:\/\//i.test(configuredBase)) {
    return configuredBase.replace(/\/api\/?$/, '');
  }
  return window.location.origin;
};

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Auth
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const changePassword = (oldPassword, newPassword) =>
  api.post('/auth/change-password', { oldPassword, newPassword });

// Bookings - College
export const submitBooking = (data) => api.post('/bookings', data);
export const getMyBookings = () => api.get('/bookings/my');
export const cancelBookingRequest = (bookingId) => api.delete(`/bookings/${bookingId}`);
export const uploadEventReport = (bookingId, file) => {
  const formData = new FormData();
  formData.append('event_report', file);
  return api.post(`/bookings/${bookingId}/report`, formData);
};

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
export const cancelApprovedBooking = (id, admin_note) =>
  api.patch(`/bookings/${id}/cancel`, { admin_note });

// Reports
export const downloadPDF = (params) =>
  api.get('/reports/pdf', { params, responseType: 'blob' });
export const downloadExcel = (params) =>
  api.get('/reports/excel', { params, responseType: 'blob' });
export const getAnalytics = () => api.get('/reports/analytics');
export const downloadActionLogs = () =>
  api.get('/reports/action-logs/download', { responseType: 'blob' });

export const toApiFileUrl = (relativePath) =>
  relativePath ? `${resolveApiOrigin()}${relativePath}` : null;

export const openProtectedFileInNewTab = async (protectedPath) => {
  const response = await api.get(protectedPath, { responseType: 'blob' });
  const contentType = response.headers?.['content-type'] || 'application/octet-stream';
  const blob = new Blob([response.data], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
};

const parseFilenameFromDisposition = (contentDisposition, fallbackName) => {
  if (!contentDisposition) return fallbackName;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || fallbackName;
};

export const downloadProtectedFile = async (protectedPath, fallbackName = 'file.pdf') => {
  const response = await api.get(protectedPath, { responseType: 'blob' });
  const contentType = response.headers?.['content-type'] || 'application/octet-stream';
  const contentDisposition = response.headers?.['content-disposition'];
  const filename = parseFilenameFromDisposition(contentDisposition, fallbackName);

  const blob = new Blob([response.data], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
};

export default api;
