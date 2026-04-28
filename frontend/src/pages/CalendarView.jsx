import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { getCalendarBookings, openProtectedFileInNewTab, toApiFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import PageBackButton from '../components/common/PageBackButton';
import { toast } from 'react-toastify';
import './Calendar.css';

/* ===============================
   COLLEGE COLORS
================================ */
const COLLEGE_COLORS = {
  'College A': '#2563eb',
  'College B': '#f97316',
  'College C': '#22c55e',
};

const DEFAULT_COLOR = '#6366f1';

/* ===============================
   HELPERS
================================ */
const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalDateTime = (dateStr, timeStr) => {
  return `${dateStr}T${timeStr}`;
};

const toDateParam = (value) => {
  if (!value) return '';
  if (value instanceof Date) return formatDateKey(value);
  return String(value).split('T')[0];
};

const CalendarView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const todayDate = formatDateKey(new Date());

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    fetchBookings(toDateParam(start), toDateParam(end));
  }, []);

  const fetchBookings = async (startDate, endDate) => {
    try {
      const res = await getCalendarBookings(startDate, endDate);

      const mapped = res.data.map((booking) => {
        const color =
          COLLEGE_COLORS[booking.college_name] || DEFAULT_COLOR;

        return {
          id: booking.id,
          title: booking.title,
          start: toLocalDateTime(
            booking.event_date.split('T')[0],
            booking.start_time
          ),
          end: toLocalDateTime(
            booking.event_date.split('T')[0],
            booking.end_time
          ),
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            ...booking,
          },
        };
      });

      setEvents(mapped);
    } catch (err) {
      console.error('Failed to load calendar events');
    }
  };

  const handleEventClick = ({ event }) => {
    setSelectedEvent(event.extendedProps);
  };

  const handleDateClick = (info) => {
    if (user?.role !== 'college') return;

    const selectedDate = info.dateStr.split('T')[0];

    if (selectedDate < todayDate) {
      toast.error('Past dates are disabled');
      return;
    }

    navigate(`/user/new-booking?date=${selectedDate}`, {
      state: { selectedDate },
    });
  };

  const openEventReport = async (url) => {
    if (!url) return;
    try {
      await openProtectedFileInNewTab(url);
    } catch {
      toast.error('Failed to open report');
    }
  };

  return (
    <div>
      <Navbar />

      <div className="calendar-page">
        <PageBackButton
          fallback={
            ['admin', 'supervisor'].includes(user?.role)
              ? '/admin/dashboard'
              : '/user/dashboard'
          }
        />

        <div className="page-header">
          <h2>Auditorium Calendar</h2>
          <p>Events are color-coded by College</p>
        </div>

        <div className="calendar-wrap">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            datesSet={(arg) => {
              fetchBookings(toDateParam(arg.start), toDateParam(arg.end));
            }}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            validRange={user?.role === 'college' ? { start: todayDate } : undefined}

            eventContent={(eventInfo) => {
              const { title, start, end } = eventInfo.event;

              const startTime = start?.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              const endTime = end?.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  style={{
                    backgroundColor: eventInfo.event.backgroundColor,
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '11px',
                  }}
                >
                  <div>{title}</div>
                  <div style={{ fontSize: '10px' }}>
                    {startTime} – {endTime}
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* MODAL */}
        {selectedEvent && (
          <div
            className="event-modal-overlay"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="event-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>

              <h3>{selectedEvent.title}</h3>

              <div className="event-details">
                <p><strong>College:</strong> {selectedEvent.college_name}</p>
                <p><strong>Date:</strong> {toDateParam(selectedEvent.event_date)}</p>
                <p><strong>Time:</strong> {selectedEvent.start_time} - {selectedEvent.end_time}</p>

                {selectedEvent.purpose && (
                  <p><strong>Purpose:</strong> {selectedEvent.purpose}</p>
                )}

                {selectedEvent.poster_url && (
                  <p>
                    <strong>Poster:</strong>{' '}
                    <a
                      href={toApiFileUrl(selectedEvent.poster_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View poster
                    </a>
                  </p>
                )}

                {selectedEvent.event_report_url && (
                  <p>
                    <strong>Event report:</strong>{' '}
                    <button
                      className="link-btn"
                      onClick={() =>
                        openEventReport(selectedEvent.event_report_url)
                      }
                    >
                      View report
                    </button>
                  </p>
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