# 🏛️ Auditorium Booking System

A full-stack web application that digitalises shared auditorium booking across three colleges. College representatives submit booking requests through the portal; the admin reviews and approves or rejects them. All parties are notified automatically by email and push notification.

---

## What This System Does

Before this system existed, booking requests were handled manually — calls, messages, or physical visits to a single admin. This led to double-bookings, lost requests, and no visibility for colleges on the status of their submissions.

This platform replaces that entirely:

- College reps log in and submit requests with event details, date, and time
- The admin sees all pending requests in a dashboard and approves or rejects them with an optional note
- Both parties are notified instantly via email and browser push notification
- A shared calendar shows all confirmed bookings so anyone can see what's occupied
- Reports can be exported as PDF or Excel at any time
- After an event, the college uploads a post-event report PDF through the portal

---

## Who Uses It

| Role | What they do |
|------|-------------|
| **College Rep** | Submit booking requests, track status, view calendar, upload post-event reports, download their own booking history |
| **Admin** | Review and approve/reject requests, view all bookings across colleges, generate reports |
| **Supervisor** | Hidden maintenance role — resets data, manages user emails, downloads audit logs |

There is one rep account per college (3 colleges total) and one admin account.

---

## Key Features

**Booking & Scheduling**
- Submit requests with title, purpose, date, start/end time, and optional event poster
- Conflict detection at the database level — overlapping approved bookings are blocked automatically
- Shared FullCalendar view showing all confirmed events colour-coded by college

**Notifications**
- Every approval and rejection triggers an email + Firebase web push to the college rep
- Admin receives an email when a new request is submitted
- A daily automated job at 2:00 PM scans for approved past events with no post-event report uploaded and sends reminder notifications — each booking is reminded at most once per day

**File Uploads**
- Event posters: JPG/PNG/WEBP, max 5 MB — visible to admin on the request card
- Post-event report: PDF only, max 10 MB — accessible only to the admin and the submitting college

**Reports**
- PDF and Excel export with date range filters
- College reps see only their own bookings; admin sees all colleges
- Supervisor can additionally download a full server action log

**Progressive Web App**
- Installable to the home screen on Android and desktop via the browser
- No app store required — works like a native app once installed
- Powered by Vite PWA plugin and Workbox for offline caching

**Live Updates**
- Admin dashboard auto-refreshes every 10 seconds — new requests appear without manual reload
- College booking pages auto-refresh every 10 seconds — status changes show up automatically

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6, FullCalendar.js |
| Backend | Node.js, Express 4 |
| Database | MySQL 8 |
| Auth | JWT + bcryptjs |
| Notifications | Nodemailer (SMTP email) + Firebase Cloud Messaging (web push) |
| Reports | pdfkit (PDF), ExcelJS (Excel) |
| File Storage | Local disk (uploads folder, served via Express) |
| PWA | Vite PWA plugin + Workbox |
| HTTP Client | Axios |

---

## Project Structure

```
auditorium-booking/
├── backend/
│   ├── config/db.js               # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js      # Login, password reset, FCM tokens
│   │   ├── bookingController.js   # Submit, approve/reject, file uploads
│   │   └── reportController.js    # PDF, Excel, analytics, audit logs
│   ├── middleware/auth.js         # JWT verification + role guards
│   ├── routes/                    # auth, bookings, reports
│   ├── utils/
│   │   ├── mailer.js              # Email sending via Nodemailer
│   │   ├── notify.js              # Firebase FCM push notifications
│   │   ├── audit.js               # DB audit log writer
│   │   └── reminderJob.js         # Daily cron job for report reminders
│   ├── logs/actions.log           # File-based action log (JSON lines)
│   ├── uploads/                   # Uploaded posters and event reports
│   ├── database/
│   │   ├── schema.sql             # Full DB schema
│   │   └── seed.js                # Seeds demo users
│   ├── server.js                  # Express entry point
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   ├── firebase-messaging-sw.js  # FCM background notification handler
│   │   └── icons/                 # App icons (192px, 512px)
│   └── src/
│       ├── components/common/     # Navbar, StatusBadge, BackButton, ProtectedRoute
│       ├── context/AuthContext.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── CalendarView.jsx
│       │   ├── Reports.jsx
│       │   ├── user/              # Dashboard, NewBooking, MyBookings
│       │   └── admin/             # Dashboard, Requests, AllBookings
│       └── utils/api.js           # All Axios API calls
│
└── package.json                   # Root scripts (concurrently)
```

---

## Database Schema

```
users
  id, username, name, email, password (bcrypt),
  role (admin | supervisor | college), college_name

bookings
  id, user_id (FK), college_name, title, purpose,
  poster_file_path, poster_original_name, poster_mime_type, poster_uploaded_at,
  event_date, start_time, end_time,
  event_report_file_path, event_report_original_name, event_report_mime_type, event_report_uploaded_at,
  status (pending | approved | rejected), admin_note,
  created_at, updated_at

audit_logs
  id, action, performed_by (FK), target_booking_id (FK), details, created_at
```

---

## Application Flow

```
College Rep                     Backend                        Admin
    |                               |                              |
    |-- Login ──────────────────────>                              |
    |<── JWT Token ─────────────────|                              |
    |                               |                              |
    |-- Submit Booking ─────────────>                              |
    |                               |── Save as pending            |
    |                               |── Email + push ─────────────>|
    |                               |                              |
    |                               |         Admin approves/rejects
    |                               |<── PATCH /status ────────────|
    |                               |── Update DB                  |
    |<── Email + push notification ─|                              |
    |                               |                              |
    |── View calendar ──────────────>                              |
    |<── All approved bookings ─────|                              |
    |                               |                              |
    [After event]                   |                              |
    |── Upload post-event report ───>                              |
    |<── Confirmation ──────────────|                              |
```