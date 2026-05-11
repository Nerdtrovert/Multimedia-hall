import StatusBadge from './StatusBadge';
import { toApiFileUrl } from '../../utils/api';

const RecentActivitySection = ({
  bookings,
  loading = false,
  emptyMessage = 'No recent approved activity right now.',
}) => (
  <div className="recent-section">
    <h3>Recent Activity</h3>

    {loading ? (
      <p>Loading...</p>
    ) : bookings.length === 0 ? (
      <p className="empty-msg">{emptyMessage}</p>
    ) : (
      <div className="table-card">
        <table className="bookings-table recent-activity-table">
          <thead>
            <tr>
              <th>College</th>
              <th>Event</th>
              <th>Date</th>
              <th>Timing</th>
              <th>Status</th>
              <th>Poster</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>
                  <strong>{booking.college_name || '—'}</strong>
                </td>
                <td>{booking.title}</td>
                <td>{new Date(booking.event_date).toLocaleDateString('en-GB')}</td>
                <td>{booking.start_time} – {booking.end_time}</td>
                <td><StatusBadge status={booking.status} /></td>
                <td>
                  {booking.poster_url ? (
                    <a
                      href={toApiFileUrl(booking.poster_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-btn"
                    >
                      View Poster
                    </a>
                  ) : (
                    <span className="muted-text">No poster</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default RecentActivitySection;
