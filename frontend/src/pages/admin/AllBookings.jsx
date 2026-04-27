import { useCallback, useEffect, useState } from 'react';
import {
  cancelApprovedBooking,
  downloadProtectedFile,
  getAllBookings,
  openProtectedFileInNewTab,
  toApiFileUrl,
} from '../../utils/api';
import { toast } from 'react-toastify';
import Navbar from '../../components/common/Navbar';
import PageBackButton from '../../components/common/PageBackButton';
import StatusBadge from '../../components/common/StatusBadge';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import '../Dashboard.css';
import './AllBookings.css';

const AllBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [filters, setFilters] = useState({ college: '', status: '', from: '', to: '' });
  const [appliedFilters, setAppliedFilters] = useState({ college: '', status: '', from: '', to: '' });

  const fetchBookings = useCallback(async (f, showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await getAllBookings(f);
      setBookings(res.data);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(appliedFilters); }, [fetchBookings, appliedFilters]);
  useAutoRefresh(() => fetchBookings(appliedFilters, false), 10000);

  const handleChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedFilters(filters);
  };
  const handleReset = () => {
    const cleared = { college: '', status: '', from: '', to: '' };
    setFilters(cleared);
    setAppliedFilters(cleared);
  };

  const openReport = async (booking) => {
    if (!booking.event_report_url) return;
    try {
      await openProtectedFileInNewTab(booking.event_report_url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open event report.');
    }
  };

  const downloadReport = async (booking) => {
    if (!booking.event_report_url) return;
    const separator = booking.event_report_url.includes('?') ? '&' : '?';
    const downloadPath = `${booking.event_report_url}${separator}download=1`;
    try {
      await downloadProtectedFile(downloadPath, `${booking.title || 'event'}-report.pdf`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download event report.');
    }
  };

  const handleAdminCancel = async (booking) => {
    const note = window.prompt(
      `Cancel approved booking "${booking.title}"?\nOptional note (shown to user):`,
      'Approved booking cancelled by admin.'
    );

    if (note === null) return;

    setCancellingId(booking.id);
    try {
      await cancelApprovedBooking(booking.id, note);
      toast.success('Approved booking cancelled.');
      await fetchBookings(appliedFilters, false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel approved booking.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-page">
        <PageBackButton fallback="/admin/dashboard" />
        <div className="page-header">
          <h2>All Bookings</h2>
          <p>View and filter all booking requests across colleges.</p>
        </div>

        <div className="filter-bar">
          <form onSubmit={handleSearch} className="filter-form">
            <select name="college" value={filters.college} onChange={handleChange}>
              <option value="">All Colleges</option>
              <option>College A</option>
              <option>College B</option>
              <option>College C</option>
            </select>
            <select name="status" value={filters.status} onChange={handleChange}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <input type="date" name="from" value={filters.from} onChange={handleChange} />
            <input type="date" name="to" value={filters.to} onChange={handleChange} />
            <button type="submit" className="btn-primary">Filter</button>
            <button type="button" className="btn-secondary" onClick={handleReset}>Reset</button>
          </form>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="table-card">
            <p className="result-count">{bookings.length} record(s) found</p>
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>College</th>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Time</th>
                   <th>Status</th>
                   <th>Poster</th>
                   <th>Event Report</th>
                    <th>Note</th>
                    <th>Submitted By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr><td colSpan="10" style={{ textAlign: 'center', color: '#9ca3af' }}>No records found.</td></tr>
                  ) : bookings.map((b) => (
                    <tr key={b.id}>
                    <td><strong>{b.college_name}</strong></td>
                    <td>{b.title}</td>
                    <td>{new Date(b.event_date).toLocaleDateString()}</td>
                     <td>{b.start_time} – {b.end_time}</td>
                     <td><StatusBadge status={b.status} /></td>
                       <td>
                         {b.poster_url ? (
                           <div style={{ display: 'grid', gap: 6 }}>
                             <a href={toApiFileUrl(b.poster_url)} target="_blank" rel="noopener noreferrer">
                               <img src={toApiFileUrl(b.poster_url)} alt={`${b.title} poster`} className="table-poster-thumb" />
                             </a>
                             <a className="link-btn" href={toApiFileUrl(b.poster_url)} target="_blank" rel="noopener noreferrer">
                               View poster
                             </a>
                           </div>
                         ) : (
                           <span style={{ color: '#9ca3af' }}>—</span>
                         )}
                       </td>
                      <td>
                        {b.event_report_url ? (
                          <div style={{ display: 'grid', gap: 6 }}>
                            <button type="button" className="link-btn" onClick={() => openReport(b)}>
                              View report
                            </button>
                            <button type="button" className="link-btn" onClick={() => downloadReport(b)}>
                              Download report
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                     </td>
                      <td>{b.admin_note || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                      <td style={{ fontSize: '12px', color: '#6b7280' }}>{b.user_email}</td>
                      <td>
                        {b.status === 'approved' ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleAdminCancel(b)}
                            disabled={cancellingId === b.id}
                            style={{ padding: '6px 10px', fontSize: 12 }}
                          >
                            {cancellingId === b.id ? 'Cancelling...' : 'Cancel booking'}
                          </button>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                    </tr>
                 ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllBookings;
