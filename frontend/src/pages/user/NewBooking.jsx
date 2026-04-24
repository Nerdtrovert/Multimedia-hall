import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getCalendarBookings, submitBooking } from '../../utils/api';
import { toast } from 'react-toastify';
import Navbar from '../../components/common/Navbar';
import PageBackButton from '../../components/common/PageBackButton';
import './BookingForm.css';

const TIME_STEP = 30;
const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 22 * 60;

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const toTimeLabel = (minutes) => {
  const hours = `${Math.floor(minutes / 60)}`.padStart(2, '0');
  const mins = `${minutes % 60}`.padStart(2, '0');
  return `${hours}:${mins}`;
};

const buildTimeSlots = () => {
  const slots = [];
  for (let minutes = DAY_START_MINUTES; minutes <= DAY_END_MINUTES; minutes += TIME_STEP) {
    slots.push(toTimeLabel(minutes));
  }
  return slots;
};

const hasOverlap = (startMinutes, endMinutes, ranges) =>
  ranges.some((range) => startMinutes < range.end && endMinutes > range.start);

const normalizeDate = (value) => (value ? value.split('T')[0] : '');

const NewBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    title: '',
    purpose: '',
    event_date: '',
    start_time: '',
    end_time: '',
    poster: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingsByDate, setBookingsByDate] = useState({});

  const today = new Date().toISOString().split('T')[0];
  const timeSlots = useMemo(buildTimeSlots, []);

  useEffect(() => {
    const presetDate = normalizeDate(
      searchParams.get('date') || location.state?.selectedDate || ''
    );

    if (presetDate) {
      setForm((current) => ({
        ...current,
        event_date: presetDate,
        start_time: '',
        end_time: '',
      }));
    }
  }, [searchParams, location.state, today]);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);

        const res = await getCalendarBookings(startDate.toISOString(), endDate.toISOString());
        const grouped = res.data.reduce((acc, booking) => {
          const dateKey = booking.event_date.split('T')[0];

          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push({
            start: toMinutes(booking.start_time),
            end: toMinutes(booking.end_time),
            label: `${booking.start_time} - ${booking.end_time} (${booking.college_name})`,
          });
          return acc;
        }, {});

        Object.values(grouped).forEach((items) => items.sort((a, b) => a.start - b.start));
        setBookingsByDate(grouped);
      } catch (err) {
        console.error('Failed to load booked slots');
      }
    };

    loadBookings();
  }, []);

  const bookedRanges = form.event_date ? (bookingsByDate[form.event_date] || []) : [];

  const startOptions = timeSlots.slice(0, -1).map((time) => {
    const startMinutes = toMinutes(time);
    const endMinutes = startMinutes + TIME_STEP;
    return {
      value: time,
      disabled: hasOverlap(startMinutes, endMinutes, bookedRanges),
    };
  });

  const endOptions = timeSlots.slice(1).map((time) => {
    const endMinutes = toMinutes(time);
    const startMinutes = form.start_time ? toMinutes(form.start_time) : null;

    return {
      value: time,
      disabled:
        !form.start_time ||
        endMinutes <= startMinutes ||
        hasOverlap(startMinutes, endMinutes, bookedRanges),
    };
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'poster') {
      setForm((current) => ({ ...current, poster: files?.[0] || null }));
      return;
    }

    if (name === 'event_date') {
      setForm((current) => ({
        ...current,
        event_date: value,
        start_time: '',
        end_time: '',
      }));
      return;
    }

    if (name === 'start_time') {
      setForm((current) => ({
        ...current,
        start_time: value,
        end_time: '',
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.start_time >= form.end_time) {
      toast.error('End time must be after start time.');
      return;
    }

    if (hasOverlap(toMinutes(form.start_time), toMinutes(form.end_time), bookedRanges)) {
      toast.error('That time overlaps with an existing approved booking.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('purpose', form.purpose);
      payload.append('event_date', form.event_date);
      payload.append('start_time', form.start_time);
      payload.append('end_time', form.end_time);
      if (form.poster) payload.append('poster', form.poster);

      await submitBooking(payload);
      toast.success('Booking request submitted! You will be notified by email.');
      navigate('/user/my-bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="form-page">
        <PageBackButton fallback="/user/dashboard" />
        <div className="form-card">
          <div className="form-title">
            <h2>New Booking Request</h2>
            <p>Pick a date first, then choose from the time slots still available.</p>
          </div>

          <form onSubmit={handleSubmit} className="booking-form">
            <div className="form-group">
              <label>Event Title *</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Annual Cultural Fest"
                required
              />
            </div>

            <div className="form-group">
              <label>Purpose / Description</label>
              <textarea
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                rows={3}
                placeholder="Briefly describe the event..."
              />
            </div>

            <div className="form-group">
              <label>Event Poster (Image)</label>
              <input
                type="file"
                name="poster"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleChange}
              />
              <small className="form-help">Optional. Upload JPG, PNG, or WEBP (max 5 MB).</small>
            </div>

            <div className="form-group">
              <label>Event Date *</label>
              <input
                type="date"
                name="event_date"
                value={form.event_date}
                onChange={handleChange}
                min={today}
                required
              />
            </div>

            {form.event_date && (
              <div className="booking-availability">
                <div className="availability-title">Booked slots for this day</div>
                {bookedRanges.length === 0 ? (
                  <p className="availability-empty">No approved bookings yet. All time slots are open.</p>
                ) : (
                  <div className="availability-chips">
                    {bookedRanges.map((range) => (
                      <span key={range.label} className="availability-chip">
                        {range.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Start Time *</label>
                <select
                  name="start_time"
                  value={form.start_time}
                  onChange={handleChange}
                  required
                  disabled={!form.event_date}
                >
                  <option value="">Select start time</option>
                  {startOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {option.value}{option.disabled ? ' - booked' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>End Time *</label>
                <select
                  name="end_time"
                  value={form.end_time}
                  onChange={handleChange}
                  required
                  disabled={!form.start_time}
                >
                  <option value="">Select end time</option>
                  {endOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {option.value}{option.disabled ? ' - unavailable' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/user/dashboard')}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewBooking;
