const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const posterDir = path.join(uploadsRoot, 'posters');
[uploadsRoot, posterDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

// Helper to create multer uploaders with consistent memory storage and error handling
const createUploader = ({ fileSizeLimit, validateFn, errorMessage }) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: fileSizeLimit },
    fileFilter: (req, file, cb) => {
      try {
        if (!validateFn(file)) return cb(new Error(errorMessage));
        cb(null, true);
      } catch (err) {
        cb(err);
      }
    },
  });

const uploadPoster = createUploader({
  fileSizeLimit: 5 * 1024 * 1024,
  validateFn: (file) => imageMimeTypes.has(file.mimetype),
  errorMessage: 'Poster must be JPG, PNG, or WEBP image.',
});

const uploadReport = createUploader({
  fileSizeLimit: 10 * 1024 * 1024,
  validateFn: (file) => file.mimetype === 'application/pdf',
  errorMessage: 'Event report must be a PDF file.',
});

module.exports = { uploadPoster, uploadReport };
