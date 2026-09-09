const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { sanitizeFilePath } = require('../utils/security');

class LocalStorageService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize all required Dry Chat folders in Windows Documents directory.
   */
  init() {
    try {
      const directories = Object.values(config.paths).filter(p => !p.endsWith('.db'));
      for (const dir of directories) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          logger.info(`Created directory: ${dir}`);
        }
      }
      this.initialized = true;
      logger.info('Local storage directories initialized successfully.');
      return true;
    } catch (err) {
      logger.error('Failed to initialize local storage directories:', err);
      throw err;
    }
  }

  /**
   * Get target directory for given media type.
   */
  getMediaDirectory(mediaType) {
    switch (mediaType) {
      case 'image':
        return config.paths.images;
      case 'video':
        return config.paths.videos;
      case 'avatar':
        return config.paths.avatars;
      case 'thumbnail':
        return config.paths.thumbnails;
      case 'cache':
        return config.paths.cache;
      default:
        return config.paths.files;
    }
  }

  /**
   * Save a buffer or stream to a specific category directory.
   */
  saveLocalFile(buffer, filename, mediaType = 'image') {
    this.ensureInitialized();
    const targetDir = this.getMediaDirectory(mediaType);
    const targetPath = path.join(targetDir, filename);
    const sanitizedPath = sanitizeFilePath(targetPath, config.paths.base);

    fs.writeFileSync(sanitizedPath, buffer);
    logger.media(`Saved local file: ${sanitizedPath}`);
    return sanitizedPath;
  }

  /**
   * Copy an external file to Dry Chat local storage safely.
   */
  copyToLocalStorage(sourcePath, targetFilename, mediaType = 'image') {
    this.ensureInitialized();
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }

    const targetDir = this.getMediaDirectory(mediaType);
    const targetPath = path.join(targetDir, targetFilename);
    const sanitizedPath = sanitizeFilePath(targetPath, config.paths.base);

    fs.copyFileSync(sourcePath, sanitizedPath);
    logger.media(`Copied file to local storage: ${sanitizedPath}`);
    return sanitizedPath;
  }

  /**
   * Calculate disk usage for storage management UI.
   */
  getStorageUsage() {
    this.ensureInitialized();
    const calculateDirSize = (dirPath) => {
      let totalSize = 0;
      let count = 0;
      if (!fs.existsSync(dirPath)) return { size: 0, count: 0 };

      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
            count++;
          }
        } catch {
          // ignore busy files
        }
      }
      return { size: totalSize, count };
    };

    return {
      images: calculateDirSize(config.paths.images),
      videos: calculateDirSize(config.paths.videos),
      files: calculateDirSize(config.paths.files),
      avatars: calculateDirSize(config.paths.avatars),
      cache: calculateDirSize(config.paths.cache),
      thumbnails: calculateDirSize(config.paths.thumbnails),
      totalBytes: [
        config.paths.images,
        config.paths.videos,
        config.paths.files,
        config.paths.avatars,
        config.paths.cache,
        config.paths.thumbnails
      ].reduce((acc, dir) => acc + calculateDirSize(dir).size, 0)
    };
  }

  /**
   * Clear temporary cache.
   */
  clearCache() {
    this.ensureInitialized();
    const cacheDir = config.paths.cache;
    const files = fs.readdirSync(cacheDir);
    let deletedCount = 0;
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(cacheDir, file));
        deletedCount++;
      } catch (err) {
        logger.warn(`Failed to delete cache file: ${file}`, err);
      }
    }
    logger.info(`Cleared ${deletedCount} cache files.`);
    return { deletedCount };
  }

  ensureInitialized() {
    if (!this.initialized) {
      this.init();
    }
  }
}

module.exports = new LocalStorageService();
