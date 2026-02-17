-- SQLite Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  json_data TEXT, -- Stored as text (JSON)
  file_size INTEGER,
  status TEXT DEFAULT 'active',
  uploaded_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ttl_files (
  id TEXT PRIMARY KEY,
  dataset_id TEXT REFERENCES datasets(id),
  ttl_content TEXT,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sparql_query TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS llm_analyses (
  id TEXT PRIMARY KEY,
  policy_id TEXT REFERENCES policies(id) ON DELETE CASCADE,
  analysis_result TEXT,
  quality_score INTEGER,
  recommendations TEXT, -- JSON text
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS query_executions (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  results TEXT, -- JSON text
  execution_time INTEGER,
  status TEXT,
  executed_by TEXT REFERENCES users(id),
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default Admin User (ID generated manually for consistency)
INSERT OR IGNORE INTO users (id, email, password_hash, full_name)
VALUES ('admin-uuid-1234', 'admin@example.com', 'password', 'Admin User');
