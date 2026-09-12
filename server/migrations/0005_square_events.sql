CREATE TABLE IF NOT EXISTS square_payment_links (
  payment_link_id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  interval TEXT NOT NULL,
  amount_jpy INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS square_event_ids (
  event_id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL
);
