import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

const resolveApiOrigin = () => {
  const configuredBase = import.meta.env.VITE_API_BASE_URL || "/api";
  if (/^https?:\/\//i.test(configuredBase)) {
    return configuredBase.replace(/\/api\/?$/, "");
  }
  return window.location.origin;
};

// Auth
export const loginUser = (data) => api.post('/auth/login', data);
const getStoredAuthToken = () => {
  const legacyToken = localStorage.getItem("token");
  if (legacyToken) return legacyToken;

  const rawAuthSession = localStorage.getItem("auth_session");
  if (!rawAuthSession) return null;

  try {
    const parsedAuthSession = JSON.parse(rawAuthSession);
    if (
      !parsedAuthSession?.token ||
      !parsedAuthSession?.expiresAt ||
      parsedAuthSession.expiresAt <= Date.now()
    ) {
      localStorage.removeItem("auth_session");
      return null;
    }
    return parsedAuthSession.token;
  } catch {
    localStorage.removeItem("auth_session");
    return null;
  }
};

// Attach token from persisted auth session (or legacy token) on every request
api.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Auth
export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email });
export const changePassword = (oldPassword, newPassword) =>
  api.post("/auth/change-password", { oldPassword, newPassword });
export const getSupervisorResetTargets = () =>
  api.get('/auth/_internal/maintenance/reset-user-targets');
export const supervisorResetUserEmail = (username, email) =>
  api.post('/auth/_internal/maintenance/reset-user-email', { username, email });
export const supervisorResetOperationalData = () =>
  api.post('/auth/_internal/maintenance/reset-operational-data');
export const registerPushToken = (token) => api.post('/auth/push-token', { token });
export const unregisterPushToken = (token) =>
  api.delete('/auth/push-token', { data: token ? { token } : {} });

// Bookings - College
export const submitBooking = (data) => api.post("/bookings", data);
export const getMyBookings = () => api.get("/bookings/my");
export const cancelBookingRequest = (bookingId) =>
  api.delete(`/bookings/${bookingId}`);
export const uploadEventReport = (bookingId, file) => {
  const formData = new FormData();
  formData.append("event_report", file);
  return api.post(`/bookings/${bookingId}/report`, formData);
};

// Bookings - Common
export const getCalendarBookings = (start, end) =>
  api.get("/bookings/calendar", {
    params: { start, end },
  });
// Bookings - Admin
export const getAllBookings = (params) => api.get("/bookings", { params });
export const getPendingBookings = () => api.get("/bookings/pending");
export const updateBookingStatus = (id, status, admin_note) =>
  api.patch(`/bookings/${id}/status`, { status, admin_note });

// Reports
export const downloadPDF = (params) =>
  api.get("/reports/pdf", { params, responseType: "blob" });
export const downloadExcel = (params) =>
  api.get("/reports/excel", { params, responseType: "blob" });
export const getAnalytics = () => api.get("/reports/analytics");
export const downloadActionLogs = () =>
  api.get("/reports/action-logs/download", { responseType: "blob" });

export const toApiFileUrl = (relativePath) =>
  relativePath ? `${resolveApiOrigin()}${relativePath}` : null;

export const openProtectedFileInNewTab = async (protectedPath) => {
  const response = await api.get(protectedPath, { responseType: "blob" });
  const contentType =
    response.headers?.["content-type"] || "application/octet-stream";
  const blob = new Blob([response.data], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
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

export const downloadProtectedFile = async (
  protectedPath,
  fallbackName = "file.pdf",
) => {
  const response = await api.get(protectedPath, { responseType: "blob" });
  const contentType =
    response.headers?.["content-type"] || "application/octet-stream";
  const contentDisposition = response.headers?.["content-disposition"];
  const filename = parseFilenameFromDisposition(
    contentDisposition,
    fallbackName,
  );

  const blob = new Blob([response.data], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
};

// Firebase Firestore API
export const setFirestoreDocument = (collection, documentId, data) =>
  api.post(`/firebase/firestore/${collection}`, { documentId, data });

export const getFirestoreDocument = (collection, documentId) =>
  api.get(`/firebase/firestore/${collection}/${documentId}`);

export const updateFirestoreDocument = (collection, documentId, data) =>
  api.patch(`/firebase/firestore/${collection}/${documentId}`, { data });

export const deleteFirestoreDocument = (collection, documentId) =>
  api.delete(`/firebase/firestore/${collection}/${documentId}`);

export const queryFirestoreCollection = (collection, conditions) =>
  api.post(`/firebase/firestore/${collection}/query`, { conditions });

// Firebase Realtime Database API
export const setRealtimeData = (path, data) =>
  api.post(`/firebase/realtime/${path}`, { data });

export const getRealtimeData = (path) =>
  api.get(`/firebase/realtime/${path}`);

export const updateRealtimeData = (path, updates) =>
  api.patch(`/firebase/realtime/${path}`, { updates });

export const deleteRealtimeData = (path) =>
  api.delete(`/firebase/realtime/${path}`);

// Firebase Analytics API
export const logAnalyticsEvent = (eventName, eventData) =>
  api.post('/firebase/analytics/log', { eventName, eventData });

// Firebase Health Check
export const checkFirebaseHealth = () =>
  api.get('/firebase/health');

export default api;
