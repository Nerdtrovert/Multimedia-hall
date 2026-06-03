import { useRef } from 'react';
import StatusBadge from './StatusBadge';
import { toApiFileUrl } from '../../utils/api';

const AnnouncementsSection = ({
  bookings,
  loading = false,
  emptyMessage = 'No announcements right now.',
}) => {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      if (direction === 'left') {
        scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="announcements-section">
      <h3>Announcements</h3>

      {loading ? (
        <p>Loading...</p>
      ) : bookings.length === 0 ? (
        <p className="empty-msg">{emptyMessage}</p>
      ) : (
        <div className="announcements-container">
          <button
            type="button"
            className="announcements-scroll-btn left"
            onClick={() => scroll('left')}
            aria-label="Scroll announcements left"
          >
            ‹
          </button>

          <div
            className="announcements-scroll-wrapper"
            ref={scrollContainerRef}
            role="list"
            aria-label="Announcements"
          >
            {bookings.map((booking) => (
              <article key={booking.id} className="announcements-card card card-hover">
                <div className="announcements-poster">
                  {booking.poster_url ? (
                    <a
                      href={toApiFileUrl(booking.poster_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${booking.title} poster`}
                    >
                      <img
                        src={toApiFileUrl(booking.poster_url)}
                        alt={`${booking.title} poster`}
                        className="announcements-poster-image"
                        loading="lazy"
                        decoding="async"
                      />
                    </a>
                  ) : (
                    <div className="announcements-poster-empty">No poster uploaded.</div>
                  )}
                </div>

                <div className="announcements-body">
                  <h4 className="announcements-title">{booking.title}</h4>
                  <p className="announcements-college">{booking.college_name || '—'}</p>

                  <div className="announcements-meta">
                    <span>{new Date(booking.event_date).toLocaleDateString('en-GB')}</span>
                    <span>{booking.start_time} – {booking.end_time}</span>
                  </div>

                  <div className="announcements-footer">
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="announcements-scroll-btn right"
            onClick={() => scroll('right')}
            aria-label="Scroll announcements right"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsSection;
