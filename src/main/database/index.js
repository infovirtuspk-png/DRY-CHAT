const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const migrator = require('./migrator');

class DatabaseService {
  constructor() {
    this.SQL = null;
    this.db = null;
    this.dbPath = null;
    this.initialized = false;
    this._persistTimeout = null;
  }

  /**
   * Initialize SQLite database engine and load/create file.
   */
  async init(customPath = null) {
    if (this.initialized && this.db) {
      return this.db;
    }

    try {
      this.dbPath = customPath || config.paths.dbFile;
      const dbDir = path.dirname(this.dbPath);

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.SQL = await initSqlJs();

      if (fs.existsSync(this.dbPath)) {
        logger.info(`Loading existing SQLite database from: ${this.dbPath}`);
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(fileBuffer);
      } else {
        logger.info(`Creating fresh SQLite database at: ${this.dbPath}`);
        this.db = new this.SQL.Database();
        this.persistSync();
      }

      // Run pending migrations
      migrator.runMigrations(this);

      this.initialized = true;
      logger.info('SQLite database initialized successfully.');
      return this.db;
    } catch (err) {
      logger.error('Failed to initialize SQLite database:', err);
      throw err;
    }
  }

  /**
   * Persist database buffer to disk synchronously.
   */
  persistSync() {
    if (!this.db || !this.dbPath) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      logger.error('Failed to persist SQLite database to disk:', err);
    }
  }

  /**
   * Persist database buffer with debounce.
   */
  persist() {
    if (this._persistTimeout) {
      clearTimeout(this._persistTimeout);
    }
    this._persistTimeout = setTimeout(() => {
      this.persistSync();
      this._persistTimeout = null;
    }, 100);
  }

  /**
   * Execute raw SQL string.
   */
  exec(sql) {
    this.ensureDb();
    try {
      const result = this.db.exec(sql);
      this.persist();
      return result;
    } catch (err) {
      logger.error('Database exec error:', err, { sql });
      throw err;
    }
  }

  /**
   * Prepare a statement with .run(), .get(), and .all() helper methods.
   */
  prepare(sql) {
    this.ensureDb();
    const self = this;

    return {
      run(...params) {
        // Flatten params array if passed as array
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        try {
          self.db.run(sql, flatParams);
          self.persist();
          return { changes: self.db.getRowsModified() };
        } catch (err) {
          logger.error('Database prepare.run error:', err, { sql, flatParams });
          throw err;
        }
      },

      get(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        try {
          const stmt = self.db.prepare(sql);
          stmt.bind(flatParams);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return null;
        } catch (err) {
          logger.error('Database prepare.get error:', err, { sql, flatParams });
          throw err;
        }
      },

      all(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        try {
          const stmt = self.db.prepare(sql);
          stmt.bind(flatParams);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (err) {
          logger.error('Database prepare.all error:', err, { sql, flatParams });
          throw err;
        }
      }
    };
  }

  /**
   * Execute in a transaction.
   */
  transaction(fn) {
    this.ensureDb();
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      this.persistSync();
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      logger.error('Database transaction rolled back:', err);
      throw err;
    }
  }

  /**
   * Close database and write final state to disk.
   */
  close() {
    if (this.db) {
      this.persistSync();
      this.db.close();
      this.db = null;
      this.initialized = false;
      logger.info('Database connection closed and saved to disk.');
    }
  }

  ensureDb() {
    if (!this.db) {
      throw new Error('Database is not initialized. Call init() first.');
    }
  }
}

const databaseService = new DatabaseService();
module.exports = databaseService;
