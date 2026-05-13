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

export const getRecentApprovedBookings = (bookings, limit = 10, now = new Date()) =>
  (Array.isArray(bookings) ? bookings : [])
    .filter((booking) => booking?.status === 'approved')
    .filter((booking) => isBookingStillActive(booking, now))
    .sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a))
    .slice(0, limit);

export const getAnnouncementCards = (bookings, now = new Date()) => {
  const approved = (Array.isArray(bookings) ? bookings : [])
    .filter((booking) => booking?.status === 'approved');

  const upcoming = approved
    .filter((booking) => isBookingStillActive(booking, now))
    .sort((a, b) => {
      const aTime = toDateTime(a?.event_date, a?.start_time)?.getTime() || 0;
      const bTime = toDateTime(b?.event_date, b?.start_time)?.getTime() || 0;
      return aTime - bTime;
    })
    .slice(0, 3);

  const past = approved
    .filter((booking) => !isBookingStillActive(booking, now))
    .sort((a, b) => {
      const aTime = toDateTime(a?.event_date, a?.end_time)?.getTime() || 0;
      const bTime = toDateTime(b?.event_date, b?.end_time)?.getTime() || 0;
      return bTime - aTime;
    })
    .slice(0, 6);

  return {
    upcoming,
    past,
    all: [...upcoming, ...past],
  };
};
