import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const DB_PATH = "/var/lib/manybot/plugins-api/manyplug.db";

mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS plugins (
    key          TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    author       TEXT DEFAULT '{}',
    description  TEXT,
    version      TEXT,
    category     TEXT,
    license      TEXT,
    service      INTEGER DEFAULT 0,
    dependencies TEXT DEFAULT '{}',
    readme       TEXT,
    repos        TEXT DEFAULT '{}',
    synced_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin     TEXT NOT NULL REFERENCES plugins(key) ON DELETE CASCADE,
    author     TEXT NOT NULL,
    body       TEXT NOT NULL,
    ip_hash    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export default db;
