import { useCallback, useEffect, useState } from 'react';
import {
  updateBookingStatus,
  getAllBookings,
  toApiFileUrl,
} from '../../utils/api';
import { openReport, downloadReport } from '../../utils/fileHelpers';
import { toast } from 'react-toastify';
import Navbar from '../../components/common/Navbar';
import PageBackButton from '../../components/common/PageBackButton';
import StatusBadge from '../../components/common/StatusBadge';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { COLLEGE_NAMES } from '../../constants/colleges';
import '../Dashboard.css';

const AllBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [filters, setFilters] = useState({
    college: '',
    status: '',
    from: '',
    to: '',
    page: 1,
  });

  const [appliedFilters, setAppliedFilters] = useState({
    college: '',
    status: '',
    from: '',
    to: '',
    page: 1,
  });

  const fetchBookings = useCallback(async (f, showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await getAllBookings(f);
      setBookings(res.data.data);
      setMeta(res.data.meta);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings(appliedFilters);
  }, [fetchBookings, appliedFilters]);

  useAutoRefresh(() => fetchBookings(appliedFilters, false), 10000);

  const handleChange = (e) =>
    setFilters({ ...filters, [e.target.name]: e.target.value });

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    const cleared = { college: '', status: '', from: '', to: '', page: 1 };
    setFilters(cleared);
    setAppliedFilters(cleared);
  };

  const handleAdminCancel = async (booking) => {
    const note = window.prompt(
      `Cancel approved booking "${booking.title}"?\nOptional note (shown to user):`,
      'Approved booking cancelled by admin.'
    );

    if (note === null) return;

    setCancellingId(booking.id);
    try {
      await updateBookingStatus(booking.id, 'rejected', note);
      toast.success('Approved booking cancelled.');
      await fetchBookings(appliedFilters, false);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Failed to cancel approved booking.'
      );
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

        {/* FILTER BAR */}
        <div className="filter-bar card">
          <form onSubmit={handleSearch} className="filter-form">
            <select
              className="input"
              name="college"
              value={filters.college}
              onChange={handleChange}
            >
              <option value="">All Colleges</option>
              {COLLEGE_NAMES.map((collegeName) => (
                <option key={collegeName}>{collegeName}</option>
              ))}
            </select>

            <select
              className="input"
              name="status"
              value={filters.status}
              onChange={handleChange}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <input
              className="input"
              type="date"
              name="from"
              value={filters.from}
              onChange={handleChange}
            />

            <input
              className="input"
              type="date"
              name="to"
              value={filters.to}
              onChange={handleChange}
            />

            <button type="submit" className="btn btn-primary">
              Filter
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleReset}
            >
              Reset
            </button>
          </form>
        </div>

        {/* TABLE */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="table-card">
            <p className="result-count">
              {meta ? meta.total : bookings.length} record(s) found
            </p>

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
                  <tr>
                    <td
                      colSpan="10"
                      style={{ textAlign: 'center', color: '#9ca3af' }}
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.college_name}</strong>
                      </td>
                      <td>{b.title}</td>
                      <td>
                        {new Date(b.event_date).toLocaleDateString()}
                      </td>
                      <td>
                        {b.start_time} – {b.end_time}
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>

                      <td>
                        {b.poster_url ? (
                          <div style={{ display: 'grid', gap: 6 }}>
                            <a
                              href={toApiFileUrl(b.poster_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={toApiFileUrl(b.poster_url)}
                                alt={`${b.title} poster`}
                                className="table-poster-thumb"
                              />
                            </a>
                            <a
                              className="link-btn"
                              href={toApiFileUrl(b.poster_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
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
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => openReport(b)}
                            >
                              View report
                            </button>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => downloadReport(b)}
                            >
                              Download report
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>

                      <td>
                        {b.admin_note || (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>

                      <td
                        style={{
                          fontSize: '12px',
                          color: '#6b7280',
                        }}
                      >
                        {b.user_email}
                      </td>

                      <td>
                        {b.status === 'approved' ? (
                          <button
                            className="btn-secondary"
                            onClick={() => handleAdminCancel(b)}
                            disabled={cancellingId === b.id}
                            style={{ padding: '6px 10px', fontSize: 12 }}
                          >
                            {cancellingId === b.id
                              ? 'Cancelling...'
                              : 'Cancel booking'}
                          </button>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {meta && meta.totalPages > 1 && (
              <div
                className="pagination"
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center',
                  marginTop: '1rem',
                }}
              >
                <button
                  className="btn-secondary"
                  disabled={meta.page <= 1}
                  onClick={() =>
                    setAppliedFilters({
                      ...appliedFilters,
                      page: meta.page - 1,
                    })
                  }
                >
                  Previous
                </button>

                <span style={{ alignSelf: 'center' }}>
                  Page {meta.page} of {meta.totalPages}
                </span>

                <button
                  className="btn-secondary"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() =>
                    setAppliedFilters({
                      ...appliedFilters,
                      page: meta.page + 1,
                    })
                  }
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllBookings;