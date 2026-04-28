const db = require("../config/db");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { logAudit, actionLogPath, ensureActionLogFile } = require("../utils/audit");

// ─── Helper: fetch bookings for report ───────────────────────────────────────
async function fetchBookingsForReport(filters, userId = null) {
  const fromDate = String(filters.from || "").split("T")[0];
  const toDate = String(filters.to || "").split("T")[0];

  let query = `
    SELECT b.id, b.college_name, b.title, b.purpose,
           DATE_FORMAT(b.event_date, '%Y-%m-%d') AS event_date,
           b.start_time, b.end_time, b.status, b.admin_note, b.created_at,
           b.poster_file_path, b.event_report_file_path,
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

  query += " ORDER BY b.event_date DESC";
  const [rows] = await db.query(query, params);
  return rows;
}

// ─── Generate PDF report ──────────────────────────────────────────────────────
const generatePDF = async (req, res) => {
  const isAdmin = ["admin", "supervisor"].includes(req.user.role);
  const filters = req.query;
  const userId = isAdmin ? null : req.user.id;

  try {
    const bookings = await fetchBookingsForReport(filters, userId);
    const apiBaseUrl = `${req.protocol}://${req.get("host")}`;

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=bookings_report.pdf",
    );
    doc.pipe(res);

    // Header
    doc.fontSize(20).text("Auditorium Booking Report", { align: "center" });
    doc
      .fontSize(10)
      .text(`Generated on: ${new Date().toLocaleString()}`, {
        align: "center",
      });
    if (!isAdmin)
      doc.text(`College: ${req.user.college_name}`, { align: "center" });
    doc.moveDown(2);

    // ── Table setup ──────────────────────────────────────────────────────────
    const headers = ["#", "College", "Title", "Description", "Date", "Time", "Status"];
    const colWidths = [30, 85, 90, 110, 60, 80, 55];
    const ROW_HEIGHT = 20;
    const TABLE_LEFT = 50;
    const TABLE_RIGHT = TABLE_LEFT + colWidths.reduce((a, b) => a + b, 0); // 560

    // ── Helper: draw one row at a fixed Y ────────────────────────────────────
    const drawRow = (cols, y, bold = false) => {
      let x = TABLE_LEFT;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 10 : 9);
      cols.forEach((col, i) => {
        doc.fillColor(bold ? "white" : "#111827");
        doc.text(
          String(col ?? "—"),
          x + 4, // 4px inner padding
          y + 4, // 4px top padding
          {
            width: colWidths[i] - 8,
            height: ROW_HEIGHT - 4,
            align: "left",
            lineBreak: false, // ← KEY: prevents cursor from dropping down
          },
        );
        x += colWidths[i];
      });
    };

    // ── Helper: draw row background + bottom border ───────────────────────────
    const drawRowBg = (y, isHeader = false, isEven = false) => {
      if (isHeader) {
        doc
          .rect(TABLE_LEFT, y, TABLE_RIGHT - TABLE_LEFT, ROW_HEIGHT)
          .fill("#1e3a5f");
      } else if (isEven) {
        doc
          .rect(TABLE_LEFT, y, TABLE_RIGHT - TABLE_LEFT, ROW_HEIGHT)
          .fill("#f0f4f8");
      }
      // bottom border
      doc
        .moveTo(TABLE_LEFT, y + ROW_HEIGHT)
        .lineTo(TABLE_RIGHT, y + ROW_HEIGHT)
        .strokeColor("#d1d5db")
        .lineWidth(0.5)
        .stroke();
    };

    // ── Draw header row ───────────────────────────────────────────────────────
    let currentY = doc.y;
    drawRowBg(currentY, true);
    drawRow(headers, currentY, true);
    currentY += ROW_HEIGHT;

    // ── Draw data rows ────────────────────────────────────────────────────────
    bookings.forEach((b, idx) => {
      // New page if near bottom
      if (currentY + ROW_HEIGHT > 750) {
        doc.addPage();
        currentY = 50;
        // Redraw header on new page
        drawRowBg(currentY, true);
        drawRow(headers, currentY, true);
        currentY += ROW_HEIGHT;
      }

      const isEven = idx % 2 === 0;
      drawRowBg(currentY, false, isEven);

      const cols = [
        idx + 1,
        b.college_name,
        b.title,
        b.purpose || "—",
        b.event_date,
        `${b.start_time} - ${b.end_time}`,
        b.status.toUpperCase(),
      ];

      drawRow(cols, currentY);
      currentY += ROW_HEIGHT;
    });

    // Advance the doc cursor past the table so doc.end() renders correctly
    doc.moveDown();
    doc.text("", TABLE_LEFT, currentY);

    const bookingsWithFiles = bookings.filter(
      (b) => b.poster_file_path || Number(b.has_event_report || 0) > 0,
    );

    if (bookingsWithFiles.length > 0) {
      if (currentY > 660) {
        doc.addPage();
        currentY = 50;
      } else {
        currentY += 20;
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#111827")
        .text("Attachment links", TABLE_LEFT, currentY);
      currentY += 18;

      bookingsWithFiles.forEach((b, index) => {
        if (currentY > 760) {
          doc.addPage();
          currentY = 50;
        }

        const posterUrl = b.poster_file_path
          ? `${apiBaseUrl}/uploads/${b.poster_file_path.replace(/\\/g, "/")}`
          : null;
        const reportUrl = Number(b.has_event_report || 0) > 0
          ? `${apiBaseUrl}/api/bookings/${b.id}/report`
          : null;

        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#111827")
          .text(`${index + 1}. ${b.title} (${b.event_date})`, TABLE_LEFT, currentY);
        currentY += 14;

        if (posterUrl) {
          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#1d4ed8")
            .text(`Poster: ${posterUrl}`, TABLE_LEFT + 10, currentY, {
              link: posterUrl,
              underline: true,
            });
          currentY += 14;
        }

        if (reportUrl) {
          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#1d4ed8")
            .text(`Post-event report: ${reportUrl}`, TABLE_LEFT + 10, currentY, {
              link: reportUrl,
              underline: true,
            });
          currentY += 14;
        }

        currentY += 6;
      });
    }

    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ message: "Failed to generate PDF." });
  }
};

// ─── Generate CSV/Excel report ────────────────────────────────────────────────
const generateExcel = async (req, res) => {
  const isAdmin = ["admin", "supervisor"].includes(req.user.role);
  const filters = req.query;
  const userId = isAdmin ? null : req.user.id;

  try {
    const bookings = await fetchBookingsForReport(filters, userId);
    const apiBaseUrl = `${req.protocol}://${req.get('host')}`;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bookings");

    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "College", key: "college_name", width: 20 },
      { header: "Title", key: "title", width: 30 },
      { header: "Purpose", key: "purpose", width: 30 },
      { header: "Date", key: "event_date", width: 15 },
      { header: "Start Time", key: "start_time", width: 12 },
      { header: "End Time", key: "end_time", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Admin Note", key: "admin_note", width: 30 },
      { header: "Poster Link", key: "poster_url", width: 50 },
      { header: "Post-Event Report Link", key: "event_report_url", width: 50 },
      { header: "Submitted At", key: "created_at", width: 20 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A5F" },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    bookings.forEach((b) => {
      const row = sheet.addRow({
        ...b,
        poster_url: b.poster_file_path ? `${apiBaseUrl}/uploads/${b.poster_file_path.replace(/\\/g, '/')}` : '',
        event_report_url: Number(b.has_event_report || 0) > 0 ? `${apiBaseUrl}/api/bookings/${b.id}/report` : '',
      });

      if (b.poster_file_path) {
        row.getCell('poster_url').value = {
          text: 'View poster',
          hyperlink: `${apiBaseUrl}/uploads/${b.poster_file_path.replace(/\\/g, '/')}`,
        };
      }

      if (Number(b.has_event_report || 0) > 0) {
        row.getCell('event_report_url').value = {
          text: 'View report',
          hyperlink: `${apiBaseUrl}/api/bookings/${b.id}/report`,
        };
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
    console.error("Excel generation error:", err);
    res.status(500).json({ message: "Failed to generate Excel report." });
  }
};

// ─── Admin: Analytics summary ────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const [totalByCollege] = await db.query(
      `SELECT college_name, COUNT(*) as total,
              SUM(status='approved') as approved,
              SUM(status='rejected') as rejected,
              SUM(status='pending') as pending
       FROM bookings GROUP BY college_name`,
    );

    const [monthlyTrend] = await db.query(
      `SELECT DATE_FORMAT(event_date, '%Y-%m') as month, COUNT(*) as count
       FROM bookings WHERE status='approved'
       GROUP BY month ORDER BY month DESC LIMIT 12`,
    );

    res.json({ totalByCollege, monthlyTrend });
  } catch (err) {
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
      `Action log downloaded by ${req.user.email}`
    );

    const filename = `actions-${new Date().toISOString().slice(0, 10)}.log`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.sendFile(actionLogPath);
  } catch (err) {
    console.error("Action log download error:", err);
    return res.status(500).json({ message: "Failed to download action logs." });
  }
};

module.exports = { generatePDF, generateExcel, getAnalytics, downloadActionLogs };
