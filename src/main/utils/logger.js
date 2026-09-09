const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure log directory exists
function ensureLogDir() {
  try {
    if (!fs.existsSync(config.paths.logs)) {
      fs.mkdirSync(config.paths.logs, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }
}

// Redaction patterns
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apikey', 'apisecret', 'credential', 'auth', 'databasesecret'];

function sanitizeData(data) {
  if (!data) return data;
  if (data instanceof Error) {
    return {
      message: data.message,
      stack: config.isDev ? data.stack : undefined
    };
  }
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data === 'object') {
    const sanitized = Array.isArray(data) ? [] : {};
    for (const key of Object.keys(data)) {
      if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        sanitized[key] = sanitizeData(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }
    return sanitized;
  }
  return data;
}

function writeLog(level, message, meta = null) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const sanitizedMeta = meta ? sanitizeData(meta) : '';
  const metaStr = sanitizedMeta ? ` | ${typeof sanitizedMeta === 'object' ? JSON.stringify(sanitizedMeta) : sanitizedMeta}` : '';
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;

  // Console output
  if (level === 'error') {
    console.error(line.trim());
  } else if (level === 'warn') {
    console.warn(line.trim());
  } else {
    console.log(line.trim());
  }

  // File output
  try {
    const logFile = path.join(config.paths.logs, `drychat-${new Date().toISOString().slice(0, 10)}.log`);
    fs.appendFileSync(logFile, line, 'utf8');
  } catch (err) {
    // Fail silently in log file write
  }
}

const logger = {
  info: (msg, meta) => writeLog('info', msg, meta),
  warn: (msg, meta) => writeLog('warn', msg, meta),
  error: (msg, meta) => writeLog('error', msg, meta),
  debug: (msg, meta) => {
    if (config.isDev) writeLog('debug', msg, meta);
  },
  sync: (msg, meta) => writeLog('sync', msg, meta),
  media: (msg, meta) => writeLog('media', msg, meta)
};

module.exports = logger;
