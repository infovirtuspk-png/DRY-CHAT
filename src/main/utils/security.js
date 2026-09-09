const path = require('path');
const crypto = require('crypto');
const config = require('../config');

/**
 * Validate and sanitize file paths to prevent directory traversal
 */
function sanitizeFilePath(userPath, allowedBaseDir = config.paths.base) {
  if (!userPath || typeof userPath !== 'string') {
    throw new Error('Invalid file path provided.');
  }

  // Resolve absolute path
  const resolvedPath = path.resolve(userPath);
  const normalizedBase = path.resolve(allowedBaseDir);

  // Path traversal check
  if (!resolvedPath.startsWith(normalizedBase)) {
    throw new Error('Access denied: Path traversal detected.');
  }

  return resolvedPath;
}

/**
 * Generate a safe unique filename preserving valid extensions
 */
function generateSafeFilename(originalName, prefix = 'media') {
  const ext = path.extname(originalName || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  return `${prefix}_${timestamp}_${randomSuffix}${ext}`;
}

/**
 * Validate MIME type for media uploads
 */
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg'],
  file: [
    'application/pdf',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'text/plain',
    'application/json',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

function validateMimeType(mimeType, mediaType = 'image') {
  const allowed = ALLOWED_MIME_TYPES[mediaType] || [];
  return allowed.includes(mimeType.toLowerCase());
}

/**
 * Validate URL to allow only safe protocols
 */
function isSafeUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * HTML/XSS Sanitization for plain text rendering
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Calculate SHA-256 hash of a file or buffer
 */
function calculateHash(bufferOrStream) {
  const hash = crypto.createHash('sha256');
  hash.update(bufferOrStream);
  return hash.digest('hex');
}

module.exports = {
  sanitizeFilePath,
  generateSafeFilename,
  validateMimeType,
  isSafeUrl,
  sanitizeText,
  calculateHash,
  ALLOWED_MIME_TYPES
};
