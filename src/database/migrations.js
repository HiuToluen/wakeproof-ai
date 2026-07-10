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
    CREATE INDEX IF NOT EXISTS idx_alarms_enabled
    ON alarms(is_enabled);
  `);
}
