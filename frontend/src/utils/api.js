import axios from "axios";
import { getStoredAuthToken } from "./authSession";

const normalizeUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const parseUrlList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => normalizeUrl(item))
    .filter(Boolean);

const getConfiguredApiBase = () => {
  const envVal = import.meta.env.VITE_API_BASE_URL;
  const currentOrigin = window.location.origin;

  // Check if we are currently accessing the app via a devtunnel url
  const matchCurrent = currentOrigin.match(/^https?:\/\/([a-z0-9]+)-3000\.(.*)$/i);
  if (matchCurrent) {
    const tunnelId = matchCurrent[1];
    const rest = matchCurrent[2];
    return `https://${tunnelId}-5000.${rest}/api`;
  }

  if (envVal && envVal !== "/api") {
    // If the environment variable is a devtunnel URL, and the browser is also on a devtunnel URL,
    // dynamically sync the tunnel ID to the current one
    if (envVal.includes(".devtunnels.ms") && currentOrigin.includes(".devtunnels.ms")) {
      const matchEnv = envVal.match(/^(https?:\/\/)[a-z0-9]+(-5000\..*)$/i);
      if (matchEnv && matchCurrent) {
        return `${matchEnv[1]}${matchCurrent[1]}${matchEnv[2]}`;
      }
    }
    return parseUrlList(envVal)[0] || "/api";
  }

  return "/api";
};

const api = axios.create({
  baseURL: getConfiguredApiBase(),
});

const normalizeProtectedApiPath = (protectedPath) => {
  const rawPath = String(protectedPath || "").trim();
  if (!rawPath) return "";

  let normalizedPath = rawPath;
  if (/^https?:\/\//i.test(rawPath)) {
    try {
      const parsedUrl = new URL(rawPath);
      normalizedPath = `${parsedUrl.pathname}${parsedUrl.search}`;
    } catch {
      normalizedPath = rawPath;
    }
  }

  if (normalizedPath === "/api") {
    return "/";
  }

  if (normalizedPath.startsWith("/api/")) {
    return normalizedPath.slice(4);
  }

  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
};

const resolveApiOrigin = () => {
  const configuredBase = getConfiguredApiBase();
  if (/^https?:\/\//i.test(configuredBase)) {
    return configuredBase.replace(/\/api\/?$/, "");
  }
  return window.location.origin;
};

// Attach token from persisted auth session (or legacy token) on every request
api.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

const request = (method, url, data, config = {}) =>
  api.request({ method, url, data, ...config });
const get = (url, config = {}) => request("get", url, undefined, config);
const post = (url, data, config = {}) => request("post", url, data, config);
const patch = (url, data, config = {}) => request("patch", url, data, config);
const del = (url, data, config = {}) => request("delete", url, data, config);
const blobGet = (url, config = {}) => get(url, { ...config, responseType: "blob" });

const AUTH_ENDPOINTS = {
  login: "/auth/login",
  forgotPassword: "/auth/forgot-password",
  changePassword: "/auth/change-password",
  resetTargets: "/auth/_internal/maintenance/reset-user-targets",
  resetUserEmail: "/auth/_internal/maintenance/reset-user-email",
  resetOperationalData: "/auth/_internal/maintenance/reset-operational-data",
  pushToken: "/auth/push-token",
};

const BOOKING_ENDPOINTS = {
  submit: "/bookings",
  mine: "/bookings/my",
  calendar: "/bookings/calendar",
  all: "/bookings",
  pending: "/bookings/pending",
};

const REPORT_ENDPOINTS = {
  pdf: "/reports/pdf",
  excel: "/reports/excel",
  analytics: "/reports/analytics",
  actionLogs: "/reports/action-logs",
};

const FIREBASE_ENDPOINTS = {
  firestoreRoot: "/firebase/firestore",
  realtimeRoot: "/firebase/realtime",
  analyticsLog: "/firebase/analytics/log",
  health: "/firebase/health",
};

// Auth
export const loginUser = (data) => post(AUTH_ENDPOINTS.login, data);
export const forgotPassword = (email) => post(AUTH_ENDPOINTS.forgotPassword, { email });
export const changePassword = (oldPassword, newPassword) =>
  post(AUTH_ENDPOINTS.changePassword, { oldPassword, newPassword });
export const getSupervisorResetTargets = () => get(AUTH_ENDPOINTS.resetTargets);
export const supervisorResetUserEmail = (username, email) =>
  post(AUTH_ENDPOINTS.resetUserEmail, { username, email });
export const supervisorResetOperationalData = () =>
  post(AUTH_ENDPOINTS.resetOperationalData, { confirm: "RESET" });
export const registerPushToken = (token) => post(AUTH_ENDPOINTS.pushToken, { token });
export const unregisterPushToken = (token) => del(AUTH_ENDPOINTS.pushToken, token ? { token } : {});

// Bookings - College
export const submitBooking = (data) => post(BOOKING_ENDPOINTS.submit, data);
export const getMyBookings = () => get(BOOKING_ENDPOINTS.mine);
export const cancelBookingRequest = (bookingId, reason) =>
  del(`/bookings/${bookingId}`, { reason });
export const uploadEventReport = (bookingId, file) => {
  const formData = new FormData();
  formData.append("event_report", file);
  return post(`/bookings/${bookingId}/report`, formData);
};

// Bookings - Common
export const getCalendarBookings = (start, end) =>
  get(BOOKING_ENDPOINTS.calendar, {
    params: { start, end },
  });

// Bookings - Admin
export const getAllBookings = (params) => get(BOOKING_ENDPOINTS.all, { params });
export const getPendingBookings = () => get(BOOKING_ENDPOINTS.pending);
export const updateBookingStatus = (id, status, admin_note) =>
  patch(`/bookings/${id}/status`, { status, admin_note });

// Reports
export const downloadPDF = (params) => blobGet(REPORT_ENDPOINTS.pdf, { params });
export const downloadExcel = (params) => blobGet(REPORT_ENDPOINTS.excel, { params });
export const getAnalytics = () => get(REPORT_ENDPOINTS.analytics);
export const downloadActionLogs = () => blobGet(`${REPORT_ENDPOINTS.actionLogs}/download`);
export const clearActionLogs = () => del(REPORT_ENDPOINTS.actionLogs);

// Firebase Firestore API
export const setFirestoreDocument = (collection, documentId, data) =>
  post(`${FIREBASE_ENDPOINTS.firestoreRoot}/${collection}`, { documentId, data });

export const getFirestoreDocument = (collection, documentId) =>
  get(`${FIREBASE_ENDPOINTS.firestoreRoot}/${collection}/${documentId}`);

export const updateFirestoreDocument = (collection, documentId, data) =>
  patch(`${FIREBASE_ENDPOINTS.firestoreRoot}/${collection}/${documentId}`, { data });

export const deleteFirestoreDocument = (collection, documentId) =>
  del(`${FIREBASE_ENDPOINTS.firestoreRoot}/${collection}/${documentId}`);

export const queryFirestoreCollection = (collection, conditions) =>
  post(`${FIREBASE_ENDPOINTS.firestoreRoot}/${collection}/query`, { conditions });

// Firebase Realtime Database API
export const setRealtimeData = (path, data) =>
  post(`${FIREBASE_ENDPOINTS.realtimeRoot}/${path}`, { data });

export const getRealtimeData = (path) =>
  get(`${FIREBASE_ENDPOINTS.realtimeRoot}/${path}`);

export const updateRealtimeData = (path, updates) =>
  patch(`${FIREBASE_ENDPOINTS.realtimeRoot}/${path}`, { updates });

export const deleteRealtimeData = (path) =>
  del(`${FIREBASE_ENDPOINTS.realtimeRoot}/${path}`);

// Firebase Analytics API
export const logAnalyticsEvent = (eventName, eventData) =>
  post(FIREBASE_ENDPOINTS.analyticsLog, { eventName, eventData });

// Firebase Health Check
export const checkFirebaseHealth = () => get(FIREBASE_ENDPOINTS.health);

export const toApiFileUrl = (relativePath) =>
  relativePath ? `${resolveApiOrigin()}${relativePath}` : null;

export const fetchProtectedFileBlob = async (protectedPath) => {
  const normalizedPath = normalizeProtectedApiPath(protectedPath);
  return blobGet(normalizedPath);
};

const readBlobTextSafely = async (blobLike) => {
  if (!blobLike || typeof blobLike.text !== "function") {
    return "";
  }

  try {
    return await blobLike.text();
  } catch {
    return "";
  }
};

export const getProtectedFileErrorMessage = async (
  error,
  fallbackMessage = "Unable to open this file.",
) => {
  const directMessage = error?.response?.data?.message;
  if (typeof directMessage === "string" && directMessage.trim()) {
    return directMessage;
  }

  const blobText = await readBlobTextSafely(error?.response?.data);
  if (blobText) {
    try {
      const parsed = JSON.parse(blobText);
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        return parsed.message;
      }
    } catch {
      if (blobText.trim()) {
        return blobText.trim();
      }
    }
  }

  return fallbackMessage;
};

export const openProtectedFileInNewTab = async (protectedPath) => {
  const response = await fetchProtectedFileBlob(protectedPath);
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
  const response = await fetchProtectedFileBlob(protectedPath);
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

export { resolveApiOrigin };

export default api;
