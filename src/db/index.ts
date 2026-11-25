import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured) {
    return path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), 'data', 'blood_portal.db');
}

export function openDatabase(customPath?: string): Database.Database {
  const dbPath = customPath ?? resolveDbPath();
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  return db;
}

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const migrationsDir = path.resolve(process.cwd(), 'src', 'db', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const appliedStmt = db.prepare('SELECT 1 FROM _migrations WHERE name = ?');
  const insertStmt = db.prepare('INSERT OR IGNORE INTO _migrations (name, applied_at) VALUES (?, ?)');

  for (const file of files) {
    const existing = appliedStmt.get(file);
    if (existing) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const tx = db.transaction(() => {
      db.exec(sql);
      insertStmt.run(file, new Date().toISOString());
    });
    tx();
  }
}
