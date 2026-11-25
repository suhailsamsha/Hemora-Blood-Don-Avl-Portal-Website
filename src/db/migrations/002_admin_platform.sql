CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'donor', 'recipient', 'hospital')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked')),
  city TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

ALTER TABLE donors ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0;

ALTER TABLE requests ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE requests ADD COLUMN rejection_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE requests ADD COLUMN assigned_to TEXT NOT NULL DEFAULT '';

ALTER TABLE donations ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';

CREATE TABLE IF NOT EXISTS blood_stock (
  id TEXT PRIMARY KEY,
  blood_group TEXT NOT NULL,
  units INTEGER NOT NULL CHECK (units >= 0),
  component TEXT NOT NULL DEFAULT 'Whole Blood',
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  collection_date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blood_stock_group ON blood_stock (blood_group, expiry_date);

CREATE TABLE IF NOT EXISTS camps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  venue TEXT NOT NULL,
  camp_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slots_total INTEGER NOT NULL CHECK (slots_total >= 1),
  slots_booked INTEGER NOT NULL DEFAULT 0,
  organizer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_camps_date ON camps (camp_date ASC);

CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL DEFAULT 'admin',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  city TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications (created_at DESC);
