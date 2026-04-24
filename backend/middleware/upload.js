const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const posterDir = path.join(uploadsRoot, 'posters');
const reportDir = path.join(uploadsRoot, 'reports');

[uploadsRoot, posterDir, reportDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const createStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, folder),
    filename: (req, file, cb) => {
      const safeBaseName = path
        .basename(file.originalname, path.extname(file.originalname))
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 50);
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${safeBaseName}${extension}`);
    },
  });

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

const uploadPoster = multer({
  storage: createStorage(posterDir),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!imageMimeTypes.has(file.mimetype)) {
      return cb(new Error('Poster must be JPG, PNG, or WEBP image.'));
    }
    cb(null, true);
  },
});

const uploadReport = multer({
  storage: createStorage(reportDir),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Event report must be a PDF file.'));
    }
    cb(null, true);
  },
});

module.exports = { uploadPoster, uploadReport };
