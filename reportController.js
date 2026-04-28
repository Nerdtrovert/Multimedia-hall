const db = require("../config/db");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { logAudit, actionLogPath, ensureActionLogFile } = require("../utils/audit");

// ─── Helper: Fetch bookings with attachments ────────────────────────────────
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

  if (userId) { query += " AND b.user_id = ?"; params.push(userId); }
  if (filters.college) { query += " AND b.college_name = ?"; params.push(filters.college); }
  if (filters.status) { query += " AND b.status = ?"; params.push(filters.status); }
  if (fromDate) { query += " AND b.event_date >= ?"; params.push(fromDate); }
  if (toDate) { query += " AND b.event_date <= ?"; params.push(toDate); }

  query += " ORDER BY b.event_date DESC";
  const [rows] = await db.query(query, params);
  return rows;
}

// ─── Generate PDF Report (Strict Table Format) ──────────────────────────────
const generatePDF = async (req, res) => {
  const isAdmin = ["admin", "supervisor"].includes(req.user.role);
  const filters = req.query;
  const userId = isAdmin ? null : req.user.id;

  try {
    const bookings = await fetchBookingsForReport(filters, userId);
    const apiBaseUrl = `${req.protocol}://${req.get("host")}`;

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=bookings_report.pdf");
    doc.pipe(res);

    // Header Branding
    doc.fillColor("#1e3a5f").fontSize(18).text("Auditorium Booking Report", { align: "center" });
    doc.fontSize(9).fillColor("#666").text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
    if (!isAdmin) doc.text(`College: ${req.user.college_name}`, { align: "center" });
    doc.moveDown(2);

    // ── Table Configuration ──
    const headers = ["#", "College", "Event Title", "Date", "Time", "Status", "Links"];
    const colWidths = [25, 80, 110, 60, 100, 60, 95];
    const ROW_HEIGHT = 28;
    const TABLE_LEFT = 35;
    const TABLE_RIGHT = TABLE_LEFT + colWidths.reduce((a, b) => a + b, 0);

    // Helper: Draw Row Background & Borders
    const drawRowBg = (y, isHeader = false, isEven = false) => {
      if (isHeader) {
        doc.rect(TABLE_LEFT, y, TABLE_RIGHT - TABLE_LEFT, ROW_HEIGHT).fill("#1e3a5f");
      } else if (isEven) {
        doc.rect(TABLE_LEFT, y, TABLE_RIGHT - TABLE_LEFT, ROW_HEIGHT).fill("#f3f4f6");
      }
      // Bottom line
      doc.moveTo(TABLE_LEFT, y + ROW_HEIGHT)
         .lineTo(TABLE_RIGHT, y + ROW_HEIGHT)
         .strokeColor("#d1d5db")
         .lineWidth(0.5)
         .stroke();
    };

    // Helper: Draw Content inside cells
    const drawRow = (cols, y, bold = false, bookingObj = null) => {
      let x = TABLE_LEFT;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 9 : 8);
      
      cols.forEach((col, i) => {
        doc.fillColor(bold ? "white" : "#111827");
        
        // Link logic for the last column
        if (!bold && i === 6 && bookingObj) {
          const posterUrl = bookingObj.poster_file_path ? `${apiBaseUrl}/uploads/${bookingObj.poster_file_path.replace(/\\/g, "/")}` : null;
          const reportUrl = Number(bookingObj.has_event_report || 0) > 0 ? `${apiBaseUrl}/api/bookings/${bookingObj.id}/report` : null;
          
          let linkX = x + 4;
          if (posterUrl) {
            doc.fillColor("#1d4ed8").text("Poster", linkX, y + 9, { link: posterUrl, underline: true, lineBreak: false });
            linkX += doc.widthOfString("Poster") + 8;
          }
          if (reportUrl) {
            doc.fillColor("#1d4ed8").text("Report", linkX, y + 9, { link: reportUrl, underline: true, lineBreak: false });
          }
        } else {
          // Standard text column
          doc.text(String(col ?? "—"), x + 4, y + 9, {
            width: colWidths[i] - 8,
            align: "left",
            lineBreak: false,
          });
        }
        x += colWidths[i];
      });
    };

    // Draw Header
    let currentY = doc.y;
    drawRowBg(currentY, true);
    drawRow(headers, currentY, true);
    currentY += ROW_HEIGHT;

    // Draw Data Rows
    bookings.forEach((b, idx) => {
      // Check for page bottom
      if (currentY + ROW_HEIGHT > 780) {
        doc.addPage();
        currentY = 40;
        drawRowBg(currentY, true);
        drawRow(headers, currentY, true);
        currentY += ROW_HEIGHT;
      }

      const isEven = idx % 2 === 0;
      drawRowBg(currentY, false, isEven);

      const rowValues = [
        idx + 1,
        b.college_name,
        b.title,
        b.event_date,
        `${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}`,
        b.status.toUpperCase(),
        "" // Placeholder for link logic in drawRow
      ];

      drawRow(rowValues, currentY, false, b);
      currentY += ROW_HEIGHT;
    });

    doc.end();
  } catch (err) {
    console.error("PDF Error:", err);
    res.status(500).json({ message: "Failed to generate PDF." });
  }
};

// ─── Generate Excel Report ──────────────────────────────────────────────────
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
      { header: "College", key: "college_name", width: 25 },
      { header: "Event Title", key: "title", width: 30 },
      { header: "Date", key: "event_date", width: 15 },
      { header: "Time", key: "time", width: 20 },
      { header: "Status", key: "status", width: 12 },
      { header: "Attachment Link", key: "link", width: 40 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };

    bookings.forEach((b) => {
      const row = sheet.addRow({
        id: b.id,
        college_name: b.college_name,
        title: b.title,
        event_date: b.event_date,
        time: `${b.start_time} - ${b.end_time}`,
        status: b.status.toUpperCase(),
      });

      if (b.poster_file_path) {
        row.getCell('link').value = {
          text: 'View Attachment',
          hyperlink: `${apiBaseUrl}/uploads/${b.poster_file_path.replace(/\\/g, '/')}`,
        };
        row.getCell('link').font = { color: { argb: 'FF0000FF' }, underline: true };
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=bookings_report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: "Excel error." });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const [totalByCollege] = await db.query(
      `SELECT college_name, COUNT(*) as total, SUM(status='approved') as approved FROM bookings GROUP BY college_name`
    );
    res.json({ totalByCollege });
  } catch (err) {
    res.status(500).json({ message: "Analytics error." });
  }
};

const downloadActionLogs = async (req, res) => {
  try {
    ensureActionLogFile();
    const filename = `actions-${new Date().toISOString().slice(0, 10)}.log`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.sendFile(actionLogPath);
  } catch (err) {
    return res.status(500).json({ message: "Log error." });
  }
};

module.exports = { generatePDF, generateExcel, getAnalytics, downloadActionLogs };