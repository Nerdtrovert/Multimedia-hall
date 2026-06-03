import { toApiFileUrl } from './api';

export const getReportViewRoute = (booking) =>
  booking?.event_report_url ? toApiFileUrl(booking.event_report_url) : null;

export const getReportDownloadRoute = (booking) =>
  booking?.event_report_url
    ? `${toApiFileUrl(booking.event_report_url)}${booking.event_report_url.includes('?') ? '&' : '?'}download=1`
    : null;
