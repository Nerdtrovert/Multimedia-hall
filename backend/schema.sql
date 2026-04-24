-- Auditorium Booking System - Database Schema
-- Run this file to initialize your MySQL database

CREATE DATABASE IF NOT EXISTS auditorium_db;
USE auditorium_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'college') NOT NULL DEFAULT 'college',
  college_name VARCHAR(100),  -- NULL for admin
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking requests table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  college_name VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  purpose TEXT,
  poster_file_path VARCHAR(255),
  poster_original_name VARCHAR(255),
  poster_mime_type VARCHAR(100),
  poster_uploaded_at TIMESTAMP NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
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

-- Seed: Admin user (password: admin123)
INSERT IGNORE INTO users (name, email, password, role) VALUES
('System Admin', 'admin@auditorium.com', '$2a$10$YourHashedPasswordHere', 'admin');

-- Seed: College users (password: college123 for all)
INSERT IGNORE INTO users (name, email, password, role, college_name) VALUES
('College A Rep', 'college_a@edu.com', '$2a$10$YourHashedPasswordHere', 'college', 'College A'),
('College B Rep', 'college_b@edu.com', '$2a$10$YourHashedPasswordHere', 'college', 'College B'),
('College C Rep', 'college_c@edu.com', '$2a$10$YourHashedPasswordHere', 'college', 'College C');

-- Note: Run the seed script (npm run seed) to insert users with properly hashed passwords
