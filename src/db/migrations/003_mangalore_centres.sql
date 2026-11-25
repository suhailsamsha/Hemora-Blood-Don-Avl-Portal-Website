CREATE TABLE IF NOT EXISTS blood_centres (
  id TEXT PRIMARY KEY,
  priority INTEGER NOT NULL DEFAULT 2,
  name TEXT NOT NULL,
  centre_type TEXT NOT NULL CHECK (centre_type IN ('Blood bank', 'Hospital')),
  zone TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Mangaluru',
  address TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  is_24_hour INTEGER NOT NULL DEFAULT 0,
  licence_info TEXT NOT NULL DEFAULT 'To be verified against e-RaktKosh',
  verification_note TEXT NOT NULL DEFAULT 'Placeholder — to be verified',
  notes TEXT NOT NULL DEFAULT '',
  lat REAL NOT NULL DEFAULT 12.8700,
  lng REAL NOT NULL DEFAULT 74.8430,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blood_centres_area ON blood_centres (priority ASC, area ASC);

ALTER TABLE blood_stock ADD COLUMN centre_id TEXT REFERENCES blood_centres(id) ON DELETE SET NULL;

ALTER TABLE camps ADD COLUMN camp_category TEXT NOT NULL DEFAULT 'community';
ALTER TABLE camps ADD COLUMN units_collected INTEGER NOT NULL DEFAULT 0;
