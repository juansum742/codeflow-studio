ALTER TABLE messages ADD COLUMN status TEXT NOT NULL DEFAULT 'Nuevo';

UPDATE messages
SET status = CASE
  WHEN is_read = 1 THEN 'Leído'
  ELSE 'Nuevo'
END
WHERE status IS NULL OR TRIM(status) = '';

CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

CREATE TABLE IF NOT EXISTS message_status_history (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  changed_at TEXT NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_message_status_history_message_id ON message_status_history(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_history_changed_at ON message_status_history(changed_at DESC);

INSERT INTO message_status_history (id, message_id, from_status, to_status, note, changed_at, changed_by)
SELECT
  lower(hex(randomblob(16))),
  id,
  NULL,
  status,
  'Estado inicial migrado al CRM',
  COALESCE(updated_at, created_at),
  'migration'
FROM messages
WHERE NOT EXISTS (
  SELECT 1
  FROM message_status_history
  WHERE message_status_history.message_id = messages.id
);
