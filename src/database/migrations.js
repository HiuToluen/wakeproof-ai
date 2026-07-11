import { getDatabase } from './database';

export async function runMigrations() {
  const database = await getDatabase();
  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      repeat_days TEXT NOT NULL DEFAULT '[]',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      snooze_duration INTEGER NOT NULL DEFAULT 5,
      max_snooze INTEGER NOT NULL DEFAULT 2,
      challenge_mode TEXT NOT NULL DEFAULT 'RANDOM',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_alarms_enabled ON alarms(is_enabled);
  `);

  const alarmColumns = await database.getAllAsync('PRAGMA table_info(alarms)');
  const columnNames = new Set(alarmColumns.map((column) => column.name));
  if (!columnNames.has('notification_id')) {
    await database.execAsync('ALTER TABLE alarms ADD COLUMN notification_id TEXT;');
  }
  if (!columnNames.has('next_trigger_at')) {
    await database.execAsync('ALTER TABLE alarms ADD COLUMN next_trigger_at TEXT;');
  }
  if (!columnNames.has('ringtone_id')) {
    await database.execAsync("ALTER TABLE alarms ADD COLUMN ringtone_id TEXT NOT NULL DEFAULT 'BRR_BRR_PATAPIM';");
  }

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS alarm_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      alarm_id TEXT NOT NULL,
      scheduled_at TEXT,
      triggered_at TEXT NOT NULL,
      dismissed_at TEXT,
      status TEXT NOT NULL,
      snooze_count INTEGER NOT NULL DEFAULT 0,
      challenge_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (alarm_id) REFERENCES alarms(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_alarm_sessions_alarm_id ON alarm_sessions(alarm_id);
  `);

  const sessionColumns = await database.getAllAsync('PRAGMA table_info(alarm_sessions)');
  const sessionColumnNames = new Set(sessionColumns.map((column) => column.name));
  if (!sessionColumnNames.has('occurrence_key')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN occurrence_key TEXT;');
  }
  if (!sessionColumnNames.has('queue_position')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN queue_position INTEGER;');
  }
  if (!sessionColumnNames.has('snooze_until')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN snooze_until TEXT;');
  }
  if (!sessionColumnNames.has('queued_at')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN queued_at TEXT;');
  }
  if (!sessionColumnNames.has('activated_at')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN activated_at TEXT;');
  }
  if (!sessionColumnNames.has('completed_at')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN completed_at TEXT;');
  }
  if (!sessionColumnNames.has('challenge_id')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN challenge_id TEXT;');
  }
  if (!sessionColumnNames.has('challenge_type')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN challenge_type TEXT;');
  }
  if (!sessionColumnNames.has('challenge_target_key')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN challenge_target_key TEXT;');
  }
  if (!sessionColumnNames.has('challenge_started_at')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN challenge_started_at TEXT;');
  }
  if (!sessionColumnNames.has('challenge_deadline_at')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN challenge_deadline_at TEXT;');
  }
  if (!sessionColumnNames.has('challenge_attempt_count')) {
    await database.execAsync('ALTER TABLE alarm_sessions ADD COLUMN challenge_attempt_count INTEGER NOT NULL DEFAULT 0;');
  }
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS challenge_attempts (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      image_uri TEXT,
      verification_status TEXT NOT NULL,
      is_valid INTEGER,
      confidence REAL,
      reason TEXT,
      attempted_at TEXT NOT NULL,
      FOREIGN KEY (session_id)
        REFERENCES alarm_sessions(id)
        ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_challenge_attempts_session_id ON challenge_attempts(session_id);
  `);
  await database.execAsync(`
    UPDATE alarm_sessions SET status = 'SNOOZING' WHERE status = 'SNOOZED';
    UPDATE alarm_sessions
    SET status = 'QUEUED'
    WHERE status IN ('RINGING', 'SNOOZING', 'CHALLENGE_ACTIVE')
      AND id NOT IN (
        SELECT id FROM alarm_sessions
        WHERE status IN ('RINGING', 'SNOOZING', 'CHALLENGE_ACTIVE')
        ORDER BY triggered_at ASC, created_at ASC, id ASC
        LIMIT 1
      );
    UPDATE alarm_sessions
    SET occurrence_key = NULL
    WHERE occurrence_key IS NOT NULL
      AND id NOT IN (
        SELECT MIN(id) FROM alarm_sessions
        WHERE occurrence_key IS NOT NULL
        GROUP BY occurrence_key
      );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_alarm_sessions_occurrence_key
    ON alarm_sessions(occurrence_key)
    WHERE occurrence_key IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_alarm_sessions_single_active
    ON alarm_sessions((1))
    WHERE status IN ('RINGING', 'SNOOZING', 'CHALLENGE_ACTIVE');
    CREATE INDEX IF NOT EXISTS idx_alarm_sessions_queue_order
    ON alarm_sessions(status, scheduled_at, triggered_at, created_at, id);
  `);
}
