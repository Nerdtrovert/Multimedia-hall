# 🏛️ Auditorium Booking System

A full-stack web application for managing shared auditorium bookings across three colleges. Built with React, Node.js/Express, and MySQL.

---

## 📁 Project Structure

```
auditorium-booking/
├── backend/
│   ├── config/
│   │   └── db.js                  # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js      # Login, getMe
│   │   ├── bookingController.js   # CRUD + conflict detection
│   │   └── reportController.js    # PDF, Excel, analytics
│   ├── middleware/
│   │   └── auth.js                # JWT verify, role guards
│   ├── models/                    # (extend here for ORM later)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   └── reports.js
│   ├── utils/
│   │   ├── mailer.js              # Nodemailer email alerts
│   │   └── audit.js               # Action logging
│   ├── schema.sql                 # DB schema (run once)
│   ├── seed.js                    # Seed default users
│   ├── server.js                  # Express entry point
│   ├── .env.example               # Env variable template
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   └── common/
│       │       ├── Navbar.jsx       # Role-aware navigation
│       │       ├── ProtectedRoute.jsx
│       │       └── StatusBadge.jsx
│       ├── context/
│       │   └── AuthContext.jsx      # Global auth state
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── CalendarView.jsx     # FullCalendar (shared)
│       │   ├── Reports.jsx          # PDF/Excel export (shared)
│       │   ├── user/
│       │   │   ├── UserDashboard.jsx
│       │   │   ├── NewBooking.jsx
│       │   │   └── MyBookings.jsx
│       │   └── admin/
│       │       ├── AdminDashboard.jsx
│       │       ├── AdminRequests.jsx  # Approve/Reject with modal
│       │       └── AllBookings.jsx    # Filtered table view
│       ├── utils/
│       │   └── api.js               # All Axios API calls
│       ├── App.jsx                  # Routes + providers
│       └── index.js
│
├── package.json                     # Root scripts (concurrently)
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js (v16+)
- MySQL (v8+)
- npm

### 1. Clone & Install

```bash
git clone <your-repo>
cd auditorium-booking

# Install all dependencies
npm run install:all
# OR manually:
cd backend && npm install
cd ../frontend && npm install
```

### 2. Set Up MySQL Database

```bash
# Log into MySQL
mysql -u root -p

# Run schema
source backend/schema.sql
```

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=auditorium_db
JWT_SECRET=change_this_to_a_long_random_string

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=yourgmail@gmail.com
MAIL_PASS=your_gmail_app_password
MAIL_FROM=Auditorium System <yourgmail@gmail.com>
```

> 📧 **Gmail setup**: Enable 2FA → Google Account → Security → App Passwords → Generate one for "Mail"

### 4. Seed Demo Users

```bash
npm run seed
# From the root directory
```

This creates:
| Email | Password | Role |
|-------|----------|------|
| admin@auditorium.com | admin123 | Admin |
| college_a@edu.com | college123 | College A |
| college_b@edu.com | college123 | College B |
| college_c@edu.com | college123 | College C |

### 5. Run the App

```bash
# From root — runs both backend (port 5000) and frontend (port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Bookings
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/bookings` | College | Submit request |
| GET | `/api/bookings/my` | College | Own bookings |
| GET | `/api/bookings/calendar` | Both | Approved bookings |
| GET | `/api/bookings` | Admin | All (filterable) |
| GET | `/api/bookings/pending` | Admin | Pending requests |
| PATCH | `/api/bookings/:id/status` | Admin | Approve/Reject |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/pdf` | Download PDF |
| GET | `/api/reports/excel` | Download Excel |
| GET | `/api/reports/analytics` | Usage stats (admin) |

---

## 🗄️ Database Schema

```
users
  id, name, email, password (bcrypt), role (admin|college), college_name

bookings
  id, user_id (FK), college_name, title, purpose,
  event_date, start_time, end_time,
  status (pending|approved|rejected), admin_note,
  created_at, updated_at

audit_logs
  id, action, performed_by (FK), target_booking_id (FK),
  details, created_at
```

---

## 🔄 Application Flow

```
College User                    Backend                      Admin
    |                               |                           |
    |-- Login ─────────────────────>|                           |
    |<─ JWT Token ─────────────────-|                           |
    |                               |                           |
    |-- Submit Booking ────────────>|                           |
    |   (date, time, title)         |-- Save as 'pending'       |
    |                               |-- Email Admin ────────────>|
    |                               |                           |
    |                               |          Admin reviews    |
    |                               |<── Approve/Reject ────────|
    |                               |── Update DB               |
    |<── Email Notification ────────|                           |
    |                               |                           |
    |── View Calendar ─────────────>|                           |
    |<── Approved Bookings ─────────|                           |
```

### Live page updates

- Admin pages auto-refresh every 10 seconds while the tab is active, so newly submitted booking requests appear without manual reload.
- User booking pages auto-refresh every 10 seconds while the tab is active, so approval/rejection status changes are shown automatically.

---

## 🚀 Next Steps / Extensions

- [ ] Add password reset via email token
- [ ] Recurring booking requests
- [ ] Admin can block specific dates
- [ ] Push notifications (Firebase FCM)
- [ ] Analytics charts on dashboard (recharts)
- [ ] Docker Compose for one-command setup
- [ ] Deploy: Render (backend) + Vercel (frontend) + PlanetScale (DB)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, FullCalendar.js |
| Backend | Node.js, Express 4 |
| Database | MySQL 8 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Email | Nodemailer (Gmail SMTP) |
| Reports | pdfkit (PDF), exceljs (Excel) |
| State | React Context API |
| HTTP Client | Axios |
