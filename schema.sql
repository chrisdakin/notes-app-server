CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  text TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  userId TEXT
);
