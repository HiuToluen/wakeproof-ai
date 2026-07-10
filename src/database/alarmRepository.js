import { getDatabase } from './database';

function parseRepeatDays(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapAlarmRow(row) {
  return {
    id: row.id,
    title: row.title,
    hour: row.hour,
    minute: row.minute,
    repeatDays: parseRepeatDays(row.repeat_days),
    isEnabled: Boolean(row.is_enabled),
    snoozeDuration: row.snooze_duration,
    maxSnooze: row.max_snooze,
    challengeMode: row.challenge_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getAlarmParams(alarm) {
  return [
    alarm.title,
    alarm.hour,
    alarm.minute,
    JSON.stringify(alarm.repeatDays),
    alarm.isEnabled ? 1 : 0,
    alarm.snoozeDuration,
    alarm.maxSnooze,
    alarm.challengeMode,
    alarm.createdAt,
    alarm.updatedAt,
  ];
}

export async function getAllAlarms() {
  try {
    const database = await getDatabase();
    const rows = await database.getAllAsync('SELECT * FROM alarms ORDER BY hour ASC, minute ASC, created_at ASC');
    return rows.map(mapAlarmRow);
  } catch (error) {
    throw new Error(`Unable to load alarms: ${error.message}`);
  }
}

export async function getAlarmById(id) {
  try {
    const database = await getDatabase();
    const row = await database.getFirstAsync('SELECT * FROM alarms WHERE id = ?', [id]);
    return row ? mapAlarmRow(row) : null;
  } catch (error) {
    throw new Error(`Unable to load alarm: ${error.message}`);
  }
}

export async function createAlarm(alarm) {
  try {
    const database = await getDatabase();
    await database.runAsync(
      `INSERT INTO alarms (
        id, title, hour, minute, repeat_days, is_enabled, snooze_duration,
        max_snooze, challenge_mode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [alarm.id, ...getAlarmParams(alarm)],
    );
    return getAlarmById(alarm.id);
  } catch (error) {
    throw new Error(`Unable to create alarm: ${error.message}`);
  }
}

export async function updateAlarm(id, alarm) {
  try {
    const database = await getDatabase();
    const result = await database.runAsync(
      `UPDATE alarms SET
        title = ?, hour = ?, minute = ?, repeat_days = ?, is_enabled = ?,
        snooze_duration = ?, max_snooze = ?, challenge_mode = ?, created_at = ?, updated_at = ?
      WHERE id = ?`,
      [...getAlarmParams(alarm), id],
    );
    if (result.changes === 0) {
      throw new Error('Alarm not found.');
    }
    return getAlarmById(id);
  } catch (error) {
    throw new Error(`Unable to update alarm: ${error.message}`);
  }
}

export async function deleteAlarm(id) {
  try {
    const database = await getDatabase();
    const result = await database.runAsync('DELETE FROM alarms WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error('Alarm not found.');
    }
  } catch (error) {
    throw new Error(`Unable to delete alarm: ${error.message}`);
  }
}

export async function setAlarmEnabled(id, isEnabled) {
  try {
    const database = await getDatabase();
    const result = await database.runAsync(
      'UPDATE alarms SET is_enabled = ?, updated_at = ? WHERE id = ?',
      [isEnabled ? 1 : 0, new Date().toISOString(), id],
    );
    if (result.changes === 0) {
      throw new Error('Alarm not found.');
    }
  } catch (error) {
    throw new Error(`Unable to update alarm status: ${error.message}`);
  }
}
