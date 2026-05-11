const fs = require("fs");
const db = require("../config/db");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const {
  logAudit,
  logError,
  actionLogPath,
  ensureActionLogFile,
  formatActorIdentity,
  appendActionLog,
} = require("../utils/audit");

// ─── Helper: fetch bookings for report ───────────────────────────────────────
async function fetchBookingsForReport(filters, userId = null) {
  const fromDate = String(filters.from || "").split("T")[0];
  const toDate = String(filters.to || "").split("T")[0];

  let query = `
    SELECT b.id, b.college_name, b.title, b.purpose,
           DATE_FORMAT(b.event_date, '%d/%m/%Y') AS event_date,
           DATE_FORMAT(b.event_date, '%Y-%m-%d') AS event_date_raw,
           b.start_time, b.end_time, b.status, b.admin_note, b.created_at,
           b.poster_file_path, b.event_report_file_path,
           CASE
             WHEN b.poster_data IS NOT NULL OR b.poster_file_path IS NOT NULL THEN 1
             ELSE 0
           END AS has_poster,
           CASE
             WHEN b.event_report_data IS NOT NULL OR b.event_report_file_path IS NOT NULL THEN 1
             ELSE 0
           END AS has_event_report
    FROM bookings b
    WHERE 1=1
  `;
  const params = [];

  if (userId) {
    query += " AND b.user_id = ?";
    params.push(userId);
  }
  if (filters.college) {
    query += " AND b.college_name = ?";
    params.push(filters.college);
  }
  if (filters.status) {
    query += " AND b.status = ?";
    params.push(filters.status);
  }
  if (fromDate) {
    query += " AND b.event_date >= ?";
    params.push(fromDate);
  }
  if (toDate) {
    query += " AND b.event_date <= ?";
    params.push(toDate);
  }

  query += " ORDER BY b.event_date";
  const [rows] = await db.query(query, params);
  return rows;
}

const toTimeMinutes = (timeValue) => {
  const [hours, minutes] = String(timeValue || "")
    .split(":")
    .map((part) => Number.parseInt(part, 10));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.NaN;
  }

  return hours * 60 + minutes;
};

const hasEventEnded = (booking, referenceDate = new Date()) => {
  const eventDate = String(booking.event_date_raw || "").split("T")[0];
  if (!eventDate) return false;

  const today = [
    referenceDate.getFullYear(),
    `${referenceDate.getMonth() + 1}`.padStart(2, "0"),
    `${referenceDate.getDate()}`.padStart(2, "0"),
  ].join("-");

  if (eventDate < today) return true;
  if (eventDate > today) return false;

  const endMinutes = toTimeMinutes(booking.end_time);
  if (Number.isNaN(endMinutes)) return false;

  const currentMinutes =
    referenceDate.getHours() * 60 + referenceDate.getMinutes();

  return endMinutes <= currentMinutes;
};

const toReportStatus = (booking) => {
  const normalizedStatus = String(booking.status || "").toLowerCase();
  if (normalizedStatus === "approved" && hasEventEnded(booking)) {
    return "EVENT ENDED";
  }
  return normalizedStatus.toUpperCase() || "—";
};

const isValidDateInput = (value) =>
  !value || /^\d{4}-\d{2}-\d{2}$/.test(String(value).split("T")[0]);

const validateReportFilters = (filters) => {
  const fromDate = String(filters.from || "").split("T")[0];
  const toDate = String(filters.to || "").split("T")[0];

  if (!isValidDateInput(fromDate) || !isValidDateInput(toDate)) {
    return "Invalid report date filter.";
  }

  if (fromDate && toDate && fromDate > toDate) {
    return "From date cannot be after To date.";
  }

  return null;
};

// ─── Generate PDF report ──────────────────────────────────────────────────────
// ─── Generate PDF report ──────────────────────────────────────────────────────
const generatePDF = async (req, res) => {
  const isAdmin = ["admin", "supervisor"].includes(req.user.role);
  const filters = req.query;
  const userId = isAdmin ? null : req.user.id;
  const filterError = validateReportFilters(filters);

  if (filterError) {
    return res.status(400).json({ message: filterError });
  }

  try {
    const bookings = await fetchBookingsForReport(filters, userId);
    const apiBaseUrl = `${req.protocol}://${req.get("host")}`;

    const doc = new PDFDocument({ 
      margin: 40, 
      layout: 'landscape',
      size: 'A4'
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=bookings_report.pdf");
    doc.pipe(res);

    // Header
    doc.fontSize(20).text("Auditorium Booking Report", { align: "center" });
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
    if (!isAdmin) doc.text(`College: ${req.user.college_name}`, { align: "center" });
    doc.moveDown(2);

    // ── Table Configuration ─────────────────────────────────────────────────
    const pageWidth = doc.page.width;
    const leftMargin = 50;                    // Increased a bit for balance
    const rightMargin = 50;
    const availableWidth = pageWidth - leftMargin - rightMargin;

    const headers = [
      "Sl no", "College", "Title", "Purpose", "Date", 
      "Start Time", "End Time", "Status", "Poster Link", "Post-Event Report Link"
    ];

    // Fluid Column Widths
    const colWidths = [
      35,   // Sl no
      130,  // College
      0,    // Title     → will be calculated (flexible)
      0,    // Purpose   → will be calculated (flexible)
      68,   // Date
      62,   // Start Time
      62,   // End Time
      86,   // Status
      78,   // Poster Link
      105   // Report Link
    ];

    // Calculate flexible widths for Title & Purpose
    const fixedWidth = colWidths.reduce((sum, w) => sum + (w || 0), 0);
    const remainingWidth = availableWidth - fixedWidth;
    const flexibleEach = Math.floor(remainingWidth / 2); // Equal share for Title & Purpose

    colWidths[2] = flexibleEach;      // Title
    colWidths[3] = flexibleEach - 5;  // Purpose (slightly smaller)

    const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
    const TABLE_LEFT = leftMargin + Math.floor((availableWidth - totalTableWidth) / 2); // Center table

    const TABLE_RIGHT = TABLE_LEFT + totalTableWidth;
    const CELL_X_PADDING = 4;
    const CELL_Y_PADDING = 5;
    const MIN_ROW_HEIGHT = 24;

    const getRowHeight = (cols, isHeader = false) => {
      const fontSize = isHeader ? 9 : 8;
      const font = isHeader ? "Helvetica-Bold" : "Helvetica";
      doc.font(font).fontSize(fontSize);

      const heights = cols.map((col, index) => {
        const textStr =
          typeof col === "object" && col !== null ? col.text || "—" : String(col ?? "—");
        return doc.heightOfString(textStr, {
          width: colWidths[index] - CELL_X_PADDING * 2,
          align: "left",
          lineBreak: true,
        });
      });

      return Math.max(
        MIN_ROW_HEIGHT,
        Math.ceil(Math.max(...heights) + CELL_Y_PADDING * 2)
      );
    };

    // ── Helper: Draw Row ─────────────────────────────────────────────────────
    const drawRow = (cols, y, rowHeight, isHeader = false) => {
      let x = TABLE_LEFT;
      const fontSize = isHeader ? 9 : 8;
      const font = isHeader ? "Helvetica-Bold" : "Helvetica";

      doc.font(font).fontSize(fontSize);

      cols.forEach((col, i) => {
        let textStr = String(col ?? "—");
        let linkUrl = null;

        if (typeof col === "object" && col !== null) {
          textStr = col.text || "—";
          linkUrl = col.link;
        }

        const textOpts = {
          width: colWidths[i] - CELL_X_PADDING * 2,
          align: "left",
          lineBreak: true,
        };

        if (linkUrl && !isHeader) {
          doc.fillColor("#1d4ed8");
          textOpts.link = linkUrl;
          textOpts.underline = true;
        } else {
          doc.fillColor(isHeader ? "white" : "#111827");
        }

        doc.text(textStr, x + CELL_X_PADDING, y + CELL_Y_PADDING, textOpts);
        x += colWidths[i];
      });
    };

    // ── Helper: Draw Row Background + Border ────────────────────────────────
    const drawRowBg = (y, rowHeight, isHeader = false, isEven = false) => {
      const width = TABLE_RIGHT - TABLE_LEFT;

      if (isHeader) {
        doc.rect(TABLE_LEFT, y, width, rowHeight).fill("#1e3a5f");
      } else if (isEven) {
        doc.rect(TABLE_LEFT, y, width, rowHeight).fill("#f8fafc");
      }

      // Bottom border
      doc.moveTo(TABLE_LEFT, y + rowHeight)
         .lineTo(TABLE_RIGHT, y + rowHeight)
         .strokeColor("#d1d5db")
         .lineWidth(0.6)
         .stroke();
    };

    // ── Draw Table ───────────────────────────────────────────────────────────
    let currentY = doc.y;

    // Header Row
    const headerHeight = getRowHeight(headers, true);
    drawRowBg(currentY, headerHeight, true);
    drawRow(headers, currentY, headerHeight, true);
    currentY += headerHeight;

    // Data Rows
    bookings.forEach((b, idx) => {
      const posterUrl = Number(b.has_poster || 0) > 0
        ? `${apiBaseUrl}/api/bookings/${b.id}/poster`
        : null;

      const reportUrl = Number(b.has_event_report || 0) > 0
        ? `${apiBaseUrl}/api/bookings/${b.id}/report`
        : null;

      const cols = [
        idx + 1,
        b.college_name || "—",
        b.title || "—",
        b.purpose || "—",
        b.event_date,
        b.start_time || "—",
        b.end_time || "—",
        toReportStatus(b),
        posterUrl ? { text: "View Poster", link: posterUrl } : "—",
        reportUrl ? { text: "View Report", link: reportUrl } : "—",
      ];

      const rowHeight = getRowHeight(cols);

      if (currentY + rowHeight > 550) {
        doc.addPage();
        currentY = 50;

        drawRowBg(currentY, headerHeight, true);
        drawRow(headers, currentY, headerHeight, true);
        currentY += headerHeight;
      }

      const isEven = idx % 2 === 0;
      drawRowBg(currentY, rowHeight, false, isEven);
      drawRow(cols, currentY, rowHeight);
      currentY += rowHeight;
    });

    doc.end();
  } catch (err) {
    logError("PDF generation error", err);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to generate PDF." });
    }
    return res.end();
  }
};
// ─── Generate CSV/Excel report ────────────────────────────────────────────────
const generateExcel = async (req, res) => {
  const isAdmin = ["admin", "supervisor"].includes(req.user.role);
  const filters = req.query;
  const userId = isAdmin ? null : req.user.id;
  const filterError = validateReportFilters(filters);

  if (filterError) {
    return res.status(400).json({ message: filterError });
  }

  try {
    const bookings = await fetchBookingsForReport(filters, userId);
    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bookings");

    sheet.columns = [
      { header: "Sl no", key: "sl_no", width: 8 },
      { header: "College", key: "college_name", width: 20 },
      { header: "Title", key: "title", width: 30 },
      { header: "Purpose", key: "purpose", width: 30 },
      { header: "Date", key: "event_date", width: 15 },
      { header: "Start Time", key: "start_time", width: 12 },
      { header: "End Time", key: "end_time", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Poster Link", key: "poster_url", width: 20 },
      { header: "Post-Event Report Link", key: "event_report_url", width: 25 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A5F" },
    };

    bookings.forEach((b, idx) => {
      const row = sheet.addRow({
        sl_no: idx + 1,
        college_name: b.college_name,
        title: b.title,
        purpose: b.purpose || "—",
        event_date: b.event_date,
        start_time: b.start_time,
        end_time: b.end_time,
        status: toReportStatus(b),
      });

      if (Number(b.has_poster || 0) > 0) {
        row.getCell('poster_url').value = {
          text: 'View Poster',
          hyperlink: `${apiBaseUrl}/api/bookings/${b.id}/poster`,
        };
      } else {
        row.getCell('poster_url').value = "—";
      }

      if (Number(b.has_event_report || 0) > 0) {
        row.getCell('event_report_url').value = {
          text: 'View Report',
          hyperlink: `${apiBaseUrl}/api/bookings/${b.id}/report`,
        };
      } else {
        row.getCell('event_report_url').value = "—";
      }
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=bookings_report.xlsx",
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logError("Excel generation error", err);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to generate Excel report." });
    }
    return res.end();
  }
};

// ─── Admin: Analytics summary ────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const [totalByCollege] = await db.query(
      `SELECT college_name, COUNT(*) as total,
              SUM(
                CASE
                  WHEN status = 'pending'
                  THEN 1
                  ELSE 0
                END
              ) as pending,
              SUM(
                CASE
                  WHEN status = 'approved'
                    AND YEAR(updated_at) = YEAR(CURDATE())
                    AND MONTH(updated_at) = MONTH(CURDATE())
                  THEN 1
                  ELSE 0
                END
              ) as approved,
              SUM(
                CASE
                  WHEN status = 'rejected'
                    AND YEAR(updated_at) = YEAR(CURDATE())
                    AND MONTH(updated_at) = MONTH(CURDATE())
                  THEN 1
                  ELSE 0
                END
              ) as rejected
       FROM bookings GROUP BY college_name`,
    );

    const [monthlyTrend] = await db.query(
      `SELECT DATE_FORMAT(event_date, '%Y-%m') as month, COUNT(*) as count
       FROM bookings WHERE status='approved'
       GROUP BY month ORDER BY month LIMIT 12`,
    );

    res.json({ totalByCollege, monthlyTrend });
  } catch (err) {
    logError("Analytics error", err);
    res.status(500).json({ message: "Server error." });
  }
};

const downloadActionLogs = async (req, res) => {
  try {
    ensureActionLogFile();

    await logAudit(
      "ACTION_LOG_DOWNLOADED",
      req.user.id,
      null,
      `Action log downloaded by ${formatActorIdentity(req.user)}`
    );

    const filename = `actions-${new Date().toISOString().slice(0, 10)}.log`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.sendFile(actionLogPath);
  } catch (err) {
    logError("Action log download error", err);
    return res.status(500).json({ message: "Failed to download action logs." });
  }
};

const clearActionLogs = async (req, res) => {
  try {
    ensureActionLogFile();
    await fs.promises.writeFile(actionLogPath, "", "utf8");

    const actor = formatActorIdentity(req.user);
    appendActionLog(`ACTION LOG CLEARED | Cleared by ${actor}`);
    await logAudit(
      "ACTION_LOG_CLEARED",
      req.user.id,
      null,
      `Action log cleared by ${actor}`
    );

    return res.json({ message: "Action logs cleared successfully." });
  } catch (err) {
    logError("Action log clear error", err);
    return res.status(500).json({ message: "Failed to clear action logs." });
  }
};

module.exports = { generatePDF, generateExcel, getAnalytics, downloadActionLogs, clearActionLogs };
