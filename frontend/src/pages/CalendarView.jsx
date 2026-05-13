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
   USER COLOR GENERATION
================================ */
const USER_COLORS = [
  '#1e40af', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#ea580c', // Orange
  '#7c3aed', // Purple
  '#0891b2', // Cyan
  '#d97706', // Amber
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#059669', // Emerald
  '#0284c7', // Sky
  '#7c2d12', // Orange dark
];

const getColorForUser = (userId) => {
  const index = (userId % USER_COLORS.length);
  return USER_COLORS[index];
};

/* ===============================
   COLLEGE COLORS (FALLBACK)
================================ */
const COLLEGE_COLORS = {
  'College A': '#1e1b4b', // Navy
  'College B': '#ea580c', // Orange
  'College C': '#f97316', // Orange light

};

const DEFAULT_COLOR = '#1e1b4b';

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

const getIsMobileViewport = () =>
  typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

const CalendarView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);

  const todayDate = formatDateKey(new Date());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(getIsMobileViewport());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // fetchBookings will be automatically triggered by FullCalendar's datesSet callback on mount

  const fetchBookings = async (startDate, endDate) => {
    try {
      const res = await getCalendarBookings(startDate, endDate);

      const mapped = res.data.map((booking) => {
        const color = getColorForUser(booking.user_id);

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
          allDay: false,
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
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const cutoffTimeInMinutes = 21 * 60 + 30; // 21:30 = 1290 minutes

    // Past dates are disabled
    if (selectedDate < todayDate) {
      toast.error('Past dates are disabled');
      return;
    }

    // Today is disabled if it's already past 21:30
    if (selectedDate === todayDate && currentTimeInMinutes >= cutoffTimeInMinutes) {
      toast.error('Bookings for today cannot be made after 21:30');
      return;
    }

    navigate(`/user/new-booking?date=${selectedDate}`, {
      state: { selectedDate },
    });
  };

  const getDayCellClassNames = (arg) => {
    if (user?.role !== 'college') return [];

    const cellDate = formatDateKey(arg.date);
    
    // Disable past dates
    if (cellDate < todayDate) {
      return ['calendar-day-disabled'];
    }

    // Disable today if it's already past 21:30
    if (cellDate === todayDate) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const cutoffTimeInMinutes = 21 * 60 + 30; // 21:30 = 1290 minutes

      if (currentTimeInMinutes >= cutoffTimeInMinutes) {
        return ['calendar-day-disabled'];
      }
    }

    return [];
  };

  // Generate legend from events - map colleges to colors
  const getCollegeLegend = () => {
    const collegeColorMap = {};
    events.forEach((event) => {
      const collegeName = event.extendedProps?.college_name;
      if (collegeName && !collegeColorMap[collegeName]) {
        collegeColorMap[collegeName] = event.backgroundColor;
      }
    });
    return Object.entries(collegeColorMap).map(([college, color]) => ({
      college,
      color,
    }));
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
            user?.role === 'supervisor'
              ? '/supervisor/dashboard'
              : user?.role === 'admin'
                ? '/admin/dashboard'
              : '/user/dashboard'
          }
        />

        <div className="page-header">
          <h2>Auditorium Calendar</h2>
          <p>Events are color-coded by requester for easier identification</p>
        </div>

        {events.length > 0 && getCollegeLegend().length > 0 && (
          <div className="calendar-legend">
            {getCollegeLegend().map((item, idx) => (
              <div key={idx} className="legend-item">
                <div
                  className="legend-color-dot"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.college}</span>
              </div>
            ))}
          </div>
        )}

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
            dayMaxEvents={true}
            moreLinkClick="popover"
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            dayCellClassNames={getDayCellClassNames}

            eventContent={(eventInfo) => {
              const { title, start, extendedProps } = eventInfo.event;
              const isCompactMonthCard =
                isMobile && eventInfo.view.type === 'dayGridMonth';

              const startTime = start?.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              // Construct a valid Date for the end time using extendedProps
              const endObj = new Date(toLocalDateTime(
                extendedProps.event_date.split('T')[0],
                extendedProps.end_time
              ));
              
              const endTime = endObj?.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  className={`calendar-event-card${isCompactMonthCard ? ' compact' : ''}`}
                  style={{ backgroundColor: eventInfo.event.backgroundColor }}
                >
                  <div className="calendar-event-title">{title}</div>
                  {!isCompactMonthCard && (
                    <div className="calendar-event-time">
                      {startTime} – {endTime}
                    </div>
                  )}
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
                <p><strong>Date:</strong> {new Date(selectedEvent.event_date).toLocaleDateString('en-GB')}</p>
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
