import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { downloadPDF, downloadExcel, downloadActionLogs } from "../utils/api";
import { toast } from "react-toastify";
import Navbar from "../components/common/Navbar";
import PageBackButton from "../components/common/PageBackButton";
import { COLLEGE_NAMES } from "../constants/colleges";
import "./Reports.css";

const EXPORT_TYPES = [
  {
    key: "pdf",
    label: "📄 Download PDF",
    api: downloadPDF,
    filename: () => "bookings_report.pdf",
  },
  {
    key: "excel",
    label: "📊 Download Excel",
    api: downloadExcel,
    filename: () => "bookings_report.xlsx",
  },
  {
    key: "logs",
    label: "📝 Download Action Logs",
    api: downloadActionLogs,
    filename: () => `actions-${new Date().toISOString().slice(0, 10)}.log`,
    supervisorOnly: true,
  },
];

const activeFilters = (filters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, v]) => String(v).trim()),
  );

const Reports = () => {
  const { user } = useAuth();
  const isAdmin = ["admin", "supervisor"].includes(user?.role);
  const isSupervisor = user?.role === "supervisor";
  const dashboardFallback = user?.role === "supervisor"
    ? "/supervisor/dashboard"
    : user?.role === "admin"
      ? "/admin/dashboard"
      : "/user/dashboard";

  const [filters, setFilters] = useState({ college: "", from: "", to: "" });
  const [loading, setLoading] = useState({});

  const handleChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleDownload = async ({ key, api, filename }) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const params = key === "logs" ? undefined : activeFilters(filters);
      const res = await api(params);
      const url = URL.createObjectURL(res.data);
      Object.assign(document.createElement("a"), {
        href: url,
        download: filename(),
      }).click();
      URL.revokeObjectURL(url);
      toast.success(`${key.toUpperCase()} downloaded successfully!`);
    } catch {
      toast.error(`Failed to download ${key.toUpperCase()} report.`);
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const visibleExports = EXPORT_TYPES.filter(
    (t) => !t.supervisorOnly || isSupervisor,
  );

  return (
    <div>
      <Navbar />
      <div className="reports-page">
        <PageBackButton
          fallback={dashboardFallback}
        />

        <div className="page-header">
          <h2>📊 Reports</h2>
          <p>
            Export booking data as <strong>PDF or Excel</strong> — includes
            event description, poster/report links, and more.
          </p>
        </div>

        <div className="reports-card">
          <div className="filters-section">
            <h3>Filters</h3>
            <div className="filters-grid">
              {isAdmin && (
                <div className="form-group">
                  <label>College</label>
                  <select
                    name="college"
                    value={filters.college}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">All Colleges</option>
                    {COLLEGE_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
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
            {visibleExports.map((type) => (
              <button
                key={type.key}
                className={`btn ${type.supervisorOnly ? "btn-secondary" : "btn-accent"}`}
                onClick={() => handleDownload(type)}
                disabled={!!loading[type.key]}
              >
                {loading[type.key]
                  ? `Generating ${type.key.toUpperCase()}...`
                  : type.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
