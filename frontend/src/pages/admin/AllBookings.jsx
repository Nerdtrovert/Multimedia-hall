import { useCallback, useEffect, useState } from 'react';
import {
  updateBookingStatus,
  getAllBookings,
  toApiFileUrl,
} from '../../utils/api';
import { getReportDownloadRoute, getReportViewRoute } from '../../utils/fileHelpers';
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
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelNote, setCancelNote] = useState(
    'Approved booking cancelled by admin.'
  );

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

  const toEventEndDate = (booking) => {
    const datePart = String(booking.event_date || '').split('T')[0];
    const endPart = String(booking.end_time || '').slice(0, 8);
    const endDate = new Date(`${datePart}T${endPart}`);
    return Number.isNaN(endDate.getTime()) ? null : endDate;
  };

  const canCancelApprovedBooking = (booking) => {
    if (booking.status !== 'approved') return false;
    const eventEndDate = toEventEndDate(booking);
    if (!eventEndDate) return false;
    return eventEndDate > new Date();
  };

  const openAdminCancelModal = (booking) => {
    if (!canCancelApprovedBooking(booking)) {
      toast.error('Completed bookings cannot be cancelled.');
      return;
    }

    setCancelModalBooking(booking);
    setCancelNote('Approved booking cancelled by admin.');
  };

  const closeAdminCancelModal = () => {
    if (cancellingId) return;
    setCancelModalBooking(null);
  };

  const handleAdminCancel = async () => {
    if (!cancelModalBooking) return;

    setCancellingId(cancelModalBooking.id);
    try {
      await updateBookingStatus(cancelModalBooking.id, 'rejected', cancelNote);
      toast.success('Approved booking cancelled.');
      setCancelModalBooking(null);
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
                        {new Date(b.event_date).toLocaleDateString('en-GB')}
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
                            <a
                              href={getReportViewRoute(b)}
                              className="link-btn"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View report
                            </a>
                            <a
                              href={getReportDownloadRoute(b)}
                              className="link-btn"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download report
                            </a>
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
                        {canCancelApprovedBooking(b) ? (
                          <button
                            className="btn-secondary"
                            onClick={() => openAdminCancelModal(b)}
                            disabled={cancellingId === b.id}
                            style={{ padding: '6px 10px', fontSize: 12 }}
                          >
                            {cancellingId === b.id
                              ? 'Cancelling...'
                              : 'Cancel booking'}
                          </button>
                        ) : ['approved', 'concluded'].includes(b.status) ? (
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>
                            Event completed
                          </span>
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

      {cancelModalBooking && (
        <div className="confirmation-modal-overlay" onClick={closeAdminCancelModal}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel approved booking</h3>
            <p>
              <strong>{cancelModalBooking.title}</strong> —{' '}
              {new Date(cancelModalBooking.event_date).toLocaleDateString('en-GB')}
            </p>
            <div className="form-group">
              <label>Optional note to college</label>
              <textarea
                className="input"
                rows={3}
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Reason for cancellation"
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeAdminCancelModal}
                disabled={Boolean(cancellingId)}
              >
                Keep booking
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAdminCancel}
                disabled={Boolean(cancellingId)}
              >
                {cancellingId ? 'Cancelling...' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllBookings;
