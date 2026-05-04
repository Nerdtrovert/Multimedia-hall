-- Auditorium Booking System - Database Schema
-- Run this file to initialize your MySQL database

CREATE DATABASE IF NOT EXISTS auditorium_db;
USE auditorium_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'supervisor', 'college') NOT NULL DEFAULT 'college',
  college_name VARCHAR(100),  -- NULL for admin/supervisor
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking requests table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  college_name VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  purpose TEXT,
  poster_data LONGBLOB,
  poster_file_path VARCHAR(255),
  poster_original_name VARCHAR(255),
  poster_mime_type VARCHAR(100),
  poster_uploaded_at TIMESTAMP NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  event_report_data LONGBLOB,
  event_report_file_path VARCHAR(255),
  event_report_original_name VARCHAR(255),
  event_report_mime_type VARCHAR(100),
  event_report_uploaded_at TIMESTAMP NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit trail table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  performed_by INT,
  target_booking_id INT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_token (token),
  INDEX idx_push_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Daily reminder log table (prevents duplicate reminder mails per booking/day)
CREATE TABLE IF NOT EXISTS report_reminder_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  reminder_date DATE NOT NULL,
  recipient_email VARCHAR(150) NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_booking_reminder_date (booking_id, reminder_date),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Seeded users are managed in backend/seed.js.
-- Update email addresses there, then run `npm run seed` to upsert by stable username without changing user IDs.
-- For existing databases, run this migration once:
-- ALTER TABLE bookings ADD COLUMN event_report_data LONGBLOB NULL AFTER end_time;
-- ALTER TABLE users MODIFY COLUMN role ENUM('admin','supervisor','college') NOT NULL DEFAULT 'college';
-- ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL AFTER id;
-- CREATE UNIQUE INDEX uq_users_username ON users (username);
