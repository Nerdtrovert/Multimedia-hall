import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { getCalendarBookings } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import PageBackButton from '../components/common/PageBackButton';
import './Calendar.css';

const COLLEGE_COLORS = {
  'College A': '#3b82f6',
  'College B': '#10b981',
  'College C': '#f59e0b',
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const CalendarView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookingsByDate, setBookingsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [visibleColleges, setVisibleColleges] = useState(() => {
    const initial = {};
    Object.keys(COLLEGE_COLORS).forEach((key) => {
      initial[key] = true;
    });
    return initial;
  });
  const [initialView, setInitialView] = useState('dayGridMonth');

  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const assetBase = apiBase.replace(/\/api\/?$/, '');

  useEffect(() => {
    const now = new Date();

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    fetchBookings(start.toISOString(), end.toISOString());
  }, []);

  useEffect(() => {
    const updateView = () => {
      if (window.matchMedia('(max-width: 680px)').matches) {
        setInitialView('timeGridDay');
      } else if (window.matchMedia('(max-width: 920px)').matches) {
        setInitialView('timeGridWeek');
      } else {
        setInitialView('dayGridMonth');
      }
    };

    updateView();
    window.addEventListener('resize', updateView);
    return () => window.removeEventListener('resize', updateView);
  }, []);

  const fetchBookings = async (startDate, endDate) => {
    setLoading(true);
    setCalendarError('');
    try {
      const res = await getCalendarBookings(startDate, endDate);
      const grouped = res.data.reduce((acc, booking) => {
        const dateKey = booking.event_date.split('T')[0];
        const startMinutes = toMinutes(booking.start_time);
        const endMinutes = toMinutes(booking.end_time);

        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push({
          id: booking.id,
          title: booking.title,
          college_name: booking.college_name,
          start_time: booking.start_time,
          end_time: booking.end_time,
          startMinutes,
          durationMinutes: Math.max(endMinutes - startMinutes, 30),
          color: COLLEGE_COLORS[booking.college_name] || '#6366f1',
        });
        return acc;
      }, {});

      Object.values(grouped).forEach((items) => {
        items.sort((a, b) => a.startMinutes - b.startMinutes);
      });

      const mapped = res.data.map((booking) => ({
        id: booking.id,
        title: booking.title,
        start: `${booking.event_date.split('T')[0]}T${booking.start_time}`,
        end: `${booking.event_date.split('T')[0]}T${booking.end_time}`,
        backgroundColor: COLLEGE_COLORS[booking.college_name] || '#6366f1',
        borderColor: COLLEGE_COLORS[booking.college_name] || '#6366f1',
        extendedProps: booking,
      }));

      setBookingsByDate(grouped);
      setEvents(mapped);
    } catch (err) {
      console.error('Failed to load calendar events');
      setCalendarError('Failed to load calendar. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = ({ event }) => {
    setSelectedEvent(event.extendedProps);
  };

  const handleDateClick = (info) => {
    if (user?.role !== 'college') return;
    const selectedDate = info.dateStr.split('T')[0];
    navigate(`/user/new-booking?date=${selectedDate}`, {
      state: { selectedDate },
    });
  };

  const toggleCollege = (college) => {
    setVisibleColleges((current) => ({ ...current, [college]: !current[college] }));
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const college = event.extendedProps?.college_name;
      if (!college) return true;
      if (visibleColleges[college] === false) return false;
      return true;
    });
  }, [events, visibleColleges]);

  const renderDayCell = (arg) => {
    const dateKey = formatDateKey(arg.date);
    const dayBookings = bookingsByDate[dateKey] || [];

    return (
      <div className="calendar-day-cell">
        <div className="calendar-day-number">{arg.dayNumberText}</div>
        {dayBookings.length > 0 && (
          <div className="calendar-day-bars">
            {dayBookings.map((booking) => (
              <span
                key={booking.id}
                className="calendar-day-bar"
                title={`${booking.college_name}: ${booking.start_time} - ${booking.end_time}`}
                style={{
                  left: `${(booking.startMinutes / 1440) * 100}%`,
                  width: `${Math.max((booking.durationMinutes / 1440) * 100, 4)}%`,
                  backgroundColor: booking.color,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <Navbar />
      <div className="calendar-page">
        <PageBackButton fallback={user?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'} />
        <div className="calendar-header">
          <div className="calendar-title">
            <h2>Auditorium Calendar</h2>
            <p>
              {user?.role === 'college'
                ? 'Click any date to start a booking request. Approved bookings are shown here.'
                : 'Approved bookings are shown here. Use filters to focus by college.'}
            </p>
          </div>
          {user?.role === 'college' && (
            <div className="calendar-cta">
              <button
                className="btn-primary"
                type="button"
                onClick={() => navigate('/user/new-booking')}
              >
                New Booking
              </button>
            </div>
          )}
        </div>

        <div className="calendar-toolbar">
          <div className="legend">
            {Object.entries(COLLEGE_COLORS).map(([college, color]) => {
              const active = visibleColleges[college] !== false;
              return (
                <button
                  key={college}
                  type="button"
                  className={`legend-pill ${active ? 'active' : ''}`}
                  onClick={() => toggleCollege(college)}
                  title={active ? `Hide ${college}` : `Show ${college}`}
                >
                  <span className="legend-dot" style={{ background: color }} />
                  {college}
                </button>
              );
            })}
          </div>
          <div className="calendar-meta">
            {loading ? <span className="meta-chip">Loading…</span> : <span className="meta-chip">{filteredEvents.length} booking(s)</span>}
          </div>
        </div>

        <div className="calendar-wrap">
          {calendarError && <div className="calendar-error">{calendarError}</div>}
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={initialView}
            datesSet={(arg) => {
              fetchBookings(arg.startStr, arg.endStr);
            }}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={filteredEvents}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            fixedWeekCount={false}
            contentHeight={780}
            aspectRatio={1.65}
            height="auto"
            dayCellContent={renderDayCell}
            dayMaxEventRows={3}
            eventDisplay="block"
            displayEventTime={true}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: true,
            }}
            eventContent={(eventInfo) => {
              const startTime = eventInfo.event.start?.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              const endTime = eventInfo.event.end?.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  style={{
                    padding: '2px 4px',
                    fontSize: '11px',
                    lineHeight: '1.2',
                    overflow: 'hidden',
                    whiteSpace: 'normal',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {eventInfo.event.title}
                  </div>
                  <div>
                    {startTime} - {endTime}
                  </div>
                </div>
              );
            }}
          />
        </div>

        {selectedEvent && (
          <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="event-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedEvent(null)} aria-label="Close">
                ×
              </button>
              <div className="event-modal-header">
                <h3>{selectedEvent.title}</h3>
                <span className="event-college-tag">{selectedEvent.college_name}</span>
              </div>
              {selectedEvent.poster_url && (
                <a
                  href={`${assetBase}${selectedEvent.poster_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="event-poster-link"
                >
                  <img
                    src={`${assetBase}${selectedEvent.poster_url}`}
                    alt="Event poster"
                    className="event-poster"
                    loading="lazy"
                  />
                </a>
              )}
              <div className="event-details">
                <div className="event-kv">
                  <div className="event-k">Date</div>
                  <div className="event-v">{new Date(selectedEvent.event_date).toDateString()}</div>
                </div>
                <div className="event-kv">
                  <div className="event-k">Time</div>
                  <div className="event-v">{selectedEvent.start_time} - {selectedEvent.end_time}</div>
                </div>
                {selectedEvent.purpose && (
                  <div className="event-kv">
                    <div className="event-k">Purpose</div>
                    <div className="event-v">{selectedEvent.purpose}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
