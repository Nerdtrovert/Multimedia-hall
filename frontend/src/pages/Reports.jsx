import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { downloadPDF, downloadExcel } from '../utils/api';
import { toast } from 'react-toastify';
import Navbar from '../components/common/Navbar';
import PageBackButton from '../components/common/PageBackButton';
import { COLLEGE_NAMES } from '../constants/colleges';
import './Reports.css';

const Reports = () => {
  const { user } = useAuth();

  // support admin + supervisor
  const isAdmin = ['admin', 'supervisor'].includes(user?.role);

  const [filters, setFilters] = useState({
    college: '',
    status: '',
    from: '',
    to: '',
  });

  const [loading, setLoading] = useState({
    pdf: false,
    excel: false,
  });
  const handleChange = (e) =>
    setFilters({ ...filters, [e.target.name]: e.target.value });

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (type) => {
    setLoading((prev) => ({ ...prev, [type]: true }));

    try {
      const rawParams = isAdmin
  ? filters
  : { from: filters.from, to: filters.to };

const params = Object.fromEntries(
  Object.entries(rawParams).filter(([, value]) => String(value || '').trim() !== '')
);

      const res =
        type === 'pdf'
          ? await downloadPDF(params)
          : await downloadExcel(params);

      triggerDownload(
        res.data,
        type === 'pdf'
          ? 'bookings_report.pdf'
          : 'bookings_report.xlsx'
      );

      toast.success(type === 'pdf' ? 'PDF downloaded!' : 'Excel downloaded!');
    } catch {
      toast.error(type === 'pdf' ? 'PDF failed.' : 'Excel failed.');
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div>
      <Navbar />
      <div className="reports-page">
        <PageBackButton
          fallback={isAdmin ? '/admin/dashboard' : '/user/dashboard'}
        />

        <div className="page-header">
          <h2>📊 Reports</h2>
          <p>Export booking data as PDF or Excel, including event description and poster/report links when available.</p>
        </div>

        <div className="reports-card">
          <div className="filters-section">
            <h3>{isAdmin ? 'Filters' : 'Date Range'}</h3>

            <div className="filters-grid">
              {isAdmin && (
                <>
                  <div className="form-group">
                    <label>College</label>
                    <select
                      name="college"
                      value={filters.college}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="">All Colleges</option>
                      {COLLEGE_NAMES.map((collegeName) => (
                        <option key={collegeName}>{collegeName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={filters.status}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>From Date</label>
                <input
                  type="date"
                  name="from"
                  value={filters.from}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label>To Date</label>
                <input
                  type="date"
                  name="to"
                  value={filters.to}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          <div className="export-buttons">
            <button
              className="btn btn-accent"
              onClick={() => handleDownload('pdf')}
              disabled={loading.pdf}
            >
              {loading.pdf ? 'Generating...' : '📄 Download PDF'}
            </button>

            <button
              className="btn btn-accent"
              onClick={() => handleDownload('excel')}
              disabled={loading.excel}
            >
              {loading.excel ? 'Generating...' : '📊 Download Excel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;