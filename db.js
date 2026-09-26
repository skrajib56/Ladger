// db.js - SQLite database connection and schema initialization
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'expense.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema ---
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  is_default INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category_id INTEGER,
  amount REAL NOT NULL,
  description TEXT,
  expense_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
`);

// Seed a set of default categories for a newly created user
const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', color: '#f97316' },
  { name: 'Transportation', color: '#3b82f6' },
  { name: 'Housing & Utilities', color: '#8b5cf6' },
  { name: 'Shopping', color: '#ec4899' },
  { name: 'Entertainment', color: '#22c55e' },
  { name: 'Health & Fitness', color: '#ef4444' },
  { name: 'Education', color: '#06b6d4' },
  { name: 'Other', color: '#6b7280' }
];

function seedDefaultCategories(userId) {
  const insert = db.prepare(
    'INSERT INTO categories (user_id, name, color, is_default) VALUES (?, ?, ?, 1)'
  );
  const insertMany = db.transaction((cats) => {
    for (const c of cats) insert.run(userId, c.name, c.color);
  });
  insertMany(DEFAULT_CATEGORIES);
}

module.exports = { db, seedDefaultCategories };
