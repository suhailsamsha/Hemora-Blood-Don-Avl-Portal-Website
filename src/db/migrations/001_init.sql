CREATE TABLE IF NOT EXISTS donors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 65),
  blood_group TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  phone_hash TEXT NOT NULL UNIQUE,
  phone_encrypted TEXT NOT NULL,
  last_donation TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  verified INTEGER NOT NULL DEFAULT 0,
  last_confirmed_at TEXT NOT NULL,
  alert_channel TEXT NOT NULL DEFAULT 'sms',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_donors_search ON donors (blood_group, city, available);
CREATE INDEX IF NOT EXISTS idx_donors_phone_hash ON donors (phone_hash);

CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  donated_at TEXT NOT NULL,
  location TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations (donor_id, donated_at DESC);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  requester_name TEXT NOT NULL,
  requester_phone_hash TEXT NOT NULL,
  requester_phone_encrypted TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  units INTEGER NOT NULL CHECK (units >= 1 AND units <= 20),
  hospital TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL CHECK (urgency IN ('critical', 'urgent', 'standard')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'expired', 'removed')),
  notes TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  fulfilled_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_status_urgency ON requests (status, urgency, created_at DESC);

CREATE TABLE IF NOT EXISTS contact_requests (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  donor_id TEXT NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_phone_encrypted TEXT NOT NULL,
  hospital TEXT NOT NULL,
  units INTEGER NOT NULL,
  urgency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  coordinator_fallback_at TEXT NOT NULL,
  responded_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_donor ON contact_requests (donor_id, status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_request ON contact_requests (request_id);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('donor', 'request')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id TEXT PRIMARY KEY,
  phone_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_created ON otp_challenges (phone_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications_log (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_donor ON notifications_log (donor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT 'awareness',
  created_at TEXT NOT NULL
);
