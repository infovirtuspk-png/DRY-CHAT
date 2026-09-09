const path = require('path');
const os = require('os');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';

// User Documents directory for Dry Chat
const userHome = os.homedir();
const dryChatBaseDir = path.join(userHome, 'Documents', 'Dry Chat');

const config = {
  isDev,
  app: {
    name: 'Dry Chat',
    version: '1.0.0',
    appId: 'com.drychat.desktop',
    defaultWidth: 1280,
    defaultHeight: 800,
    minWidth: 960,
    minHeight: 600
  },
  paths: {
    base: dryChatBaseDir,
    images: path.join(dryChatBaseDir, 'Images'),
    videos: path.join(dryChatBaseDir, 'Videos'),
    files: path.join(dryChatBaseDir, 'Files'),
    avatars: path.join(dryChatBaseDir, 'Avatars'),
    downloads: path.join(dryChatBaseDir, 'Downloads'),
    cache: path.join(dryChatBaseDir, 'Cache'),
    thumbnails: path.join(dryChatBaseDir, 'Thumbnails'),
    database: path.join(dryChatBaseDir, 'Database'),
    logs: path.join(dryChatBaseDir, 'Logs'),
    dbFile: path.join(dryChatBaseDir, 'Database', 'drychat.db')
  },
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAU7gmDJyP0G424Y4I0BcYLP6boap1VAzI',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'drychat-a27ad.firebaseapp.com',
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://drychat-a27ad-default-rtdb.firebaseio.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'drychat-a27ad',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'drychat-a27ad.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '639739874507',
    appId: process.env.FIREBASE_APP_ID || '1:639739874507:web:28e9c3eb360b7ce2d25f4e',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-3WLPW7YCWD',
    databaseSecret: process.env.FIREBASE_DATABASE_SECRET || 'TIw7DqdJtFdZkW2UbOrPghS2z9i0WfRl3BVC2kzx'
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'bf2vcing',
    apiKey: process.env.CLOUDINARY_API_KEY || '239473932528658',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'l6QsCmsNrCoBKOeTMqXjV3M6oAA',
    url: process.env.CLOUDINARY_URL || 'cloudinary://239473932528658:l6QsCmsNrCoBKOeTMqXjV3M6oAA@bf2vcing',
    expirationSeconds: parseInt(process.env.MEDIA_TRANSPORT_EXPIRATION_SECONDS || '10', 10)
  },
  sync: {
    maxRetries: 6,
    initialBackoffMs: 1000,
    maxBackoffMs: 32000,
    syncIntervalMs: 5000
  },
  limits: {
    maxMessageLength: 5000,
    maxImageSizeBytes: 20 * 1024 * 1024, // 20MB
    maxVideoSizeBytes: 100 * 1024 * 1024, // 100MB
    maxPaginationLimit: 50
  }
};

module.exports = config;
