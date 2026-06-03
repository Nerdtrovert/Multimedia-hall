const toDatePart = (value) => String(value || '').split('T')[0];

const toDateTime = (dateValue, timeValue = '00:00:00') => {
  const datePart = toDatePart(dateValue);
  const safeTime = String(timeValue || '00:00:00').slice(0, 8) || '00:00:00';
  if (!datePart) return null;
  const parsed = new Date(`${datePart}T${safeTime}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getSortTimestamp = (booking) => {
  const updatedAt = booking?.updated_at ? new Date(booking.updated_at) : null;
  if (updatedAt && !Number.isNaN(updatedAt.getTime())) return updatedAt.getTime();

  const createdAt = booking?.created_at ? new Date(booking.created_at) : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) return createdAt.getTime();

  const eventStart = toDateTime(booking?.event_date, booking?.start_time);
  return eventStart ? eventStart.getTime() : 0;
};

export const isBookingStillActive = (booking, now = new Date()) => {
  const eventEnd = toDateTime(booking?.event_date, booking?.end_time);
  return !!eventEnd && eventEnd.getTime() >= now.getTime();
};

// Utility to ensure callers can treat inputs as arrays without repeating checks
const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const getRecentApprovedBookings = (bookings, limit = 10, now = new Date()) =>
  ensureArray(bookings)
    .filter((booking) => ['approved', 'concluded'].includes(booking?.status) && isBookingStillActive(booking, now))
    .sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a))
    .slice(0, limit);

export const getAnnouncementCards = (bookings, now = new Date()) => {
  const upcoming = [];
  const past = [];

  ensureArray(bookings).forEach((booking) => {
    if (!['approved', 'concluded'].includes(booking?.status)) return;

    if (isBookingStillActive(booking, now)) {
      upcoming.push(booking);
      return;
    }

    past.push(booking);
  });

  upcoming.sort((a, b) => {
    const aTime = toDateTime(a?.event_date, a?.start_time)?.getTime() || 0;
    const bTime = toDateTime(b?.event_date, b?.start_time)?.getTime() || 0;
    return aTime - bTime;
  });

  past.sort((a, b) => {
    const aTime = toDateTime(a?.event_date, a?.end_time)?.getTime() || 0;
    const bTime = toDateTime(b?.event_date, b?.end_time)?.getTime() || 0;
    return bTime - aTime;
  });

  const limitedUpcoming = upcoming.slice(0, 3);
  const limitedPast = past.slice(0, 6);

  return {
    upcoming: limitedUpcoming,
    past: limitedPast,
    all: [...limitedUpcoming, ...limitedPast],
  };
};
