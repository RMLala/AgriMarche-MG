PRAGMA foreign_keys = ON;

-- AppForge license identity is opaque and issued by the private License Authority.
-- No customer email, password, or organization login is stored in this database.
CREATE TABLE IF NOT EXISTS sync_records (
  license_scope TEXT NOT NULL,
  record_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  payload_json TEXT NOT NULL,
  last_op_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (license_scope, record_id)
);

CREATE TABLE IF NOT EXISTS sync_operations (
  license_scope TEXT NOT NULL,
  op_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  record_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'complete')),
  result_json TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (license_scope, op_id)
);

CREATE TABLE IF NOT EXISTS sync_changes (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  license_scope TEXT NOT NULL,
  op_id TEXT NOT NULL,
  record_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  UNIQUE (license_scope, op_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_changes_scope_seq ON sync_changes (license_scope, seq);
CREATE INDEX IF NOT EXISTS idx_sync_operations_created ON sync_operations (license_scope, created_at);
