const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', '..', 'database', 'migrations');

class Migrator {
  /**
   * Run all pending migrations in order
   */
  runMigrations(dbService) {
    // Ensure migrations table exists
    dbService.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);

    // Fetch already applied migrations
    const appliedRows = dbService.prepare('SELECT version FROM migrations ORDER BY version ASC').all();
    const appliedVersions = new Set(appliedRows.map(r => r.version));

    // Read migration files
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      logger.warn(`Migrations directory not found at: ${MIGRATIONS_DIR}`);
      return;
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => {
        const vA = parseInt(a.split('_')[0], 10);
        const vB = parseInt(b.split('_')[0], 10);
        return vA - vB;
      });

    for (const file of files) {
      const version = parseInt(file.split('_')[0], 10);
      if (!appliedVersions.has(version)) {
        logger.info(`Applying migration: ${file} (v${version})`);
        const sqlPath = path.join(MIGRATIONS_DIR, file);
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Execute migration
        dbService.exec(sqlContent);
        dbService.prepare('INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)').run([version, file, Date.now()]);
        logger.info(`Migration applied successfully: ${file}`);
      }
    }
    dbService.persistSync();
  }
}

module.exports = new Migrator();
