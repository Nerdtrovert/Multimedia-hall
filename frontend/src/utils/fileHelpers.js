import { toast } from 'react-toastify';
import { downloadProtectedFile, openProtectedFileInNewTab } from './api';

export const openReport = async (booking) => {
  if (!booking.event_report_url) return;
  try {
    await openProtectedFileInNewTab(booking.event_report_url);
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to open event report.');
  }
};

export const downloadReport = async (booking) => {
  if (!booking.event_report_url) return;
  const separator = booking.event_report_url.includes('?') ? '&' : '?';
  const downloadPath = `${booking.event_report_url}${separator}download=1`;
  try {
    await downloadProtectedFile(downloadPath, `${booking.title || 'event'}-report.pdf`);
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to download event report.');
  }
};
