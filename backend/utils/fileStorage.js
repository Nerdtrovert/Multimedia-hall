const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const uploadsRoot = path.join(__dirname, '..', 'uploads');

const EXTENSIONS_BY_MIME = {
  'application/pdf': '.pdf',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const UPLOAD_KINDS = {
  attachment: {
    allowedMimeTypes: new Set(['application/pdf']),
    directory: 'attachments',
  },
  poster: {
    allowedMimeTypes: new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp']),
    directory: 'posters',
  },
};

const createUploadError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseDataUrl = (dataUrl) => {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');

  if (!match) {
    throw createUploadError('Invalid file payload received.');
  }

  return {
    base64: match[2],
    mimeType: match[1],
  };
};

const getTargetDirectory = (kind) => {
  const uploadKind = UPLOAD_KINDS[kind];

  if (!uploadKind) {
    throw createUploadError('Unsupported upload type.');
  }

  return path.join(uploadsRoot, uploadKind.directory);
};

const ensureUploadDirectories = async () => {
  await fs.mkdir(uploadsRoot, { recursive: true });

  await Promise.all(
    Object.keys(UPLOAD_KINDS).map((kind) =>
      fs.mkdir(getTargetDirectory(kind), { recursive: true })
    )
  );
};

const saveBase64Upload = async (file, kind) => {
  const uploadKind = UPLOAD_KINDS[kind];

  if (!uploadKind) {
    throw createUploadError('Unsupported upload type.');
  }

  if (!file?.name || !file?.dataUrl) {
    throw createUploadError('File name and file data are required.');
  }

  const { mimeType, base64 } = parseDataUrl(file.dataUrl);

  if (!uploadKind.allowedMimeTypes.has(mimeType)) {
    throw createUploadError('This file type is not allowed.');
  }

  if (file.type && file.type !== mimeType) {
    throw createUploadError('Uploaded file metadata does not match the file content.');
  }

  const buffer = Buffer.from(base64, 'base64');

  if (!buffer.length) {
    throw createUploadError('Uploaded file is empty.');
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw createUploadError('Each uploaded file must be 5 MB or smaller.');
  }

  const safeOriginalName = path.basename(file.name);
  const extension = path.extname(safeOriginalName) || EXTENSIONS_BY_MIME[mimeType] || '';
  const storedName = `${kind}-${Date.now()}-${crypto.randomUUID()}${extension.toLowerCase()}`;
  const targetPath = path.join(getTargetDirectory(kind), storedName);

  await fs.writeFile(targetPath, buffer);

  return {
    name: safeOriginalName,
    url: `/uploads/${uploadKind.directory}/${storedName}`,
  };
};

const deleteStoredFile = async (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
    return;
  }

  const relativePath = fileUrl.replace('/uploads/', '').replace(/\//g, path.sep);
  const resolvedUploadRoot = path.resolve(uploadsRoot);
  const resolvedPath = path.resolve(uploadsRoot, relativePath);

  if (!resolvedPath.startsWith(resolvedUploadRoot)) {
    return;
  }

  try {
    await fs.unlink(resolvedPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
};

const cleanupStoredAssets = async (booking) => {
  await Promise.allSettled([
    deleteStoredFile(booking?.poster_url),
    deleteStoredFile(booking?.attachment_url),
  ]);
};

module.exports = {
  cleanupStoredAssets,
  deleteStoredFile,
  ensureUploadDirectories,
  saveBase64Upload,
};
