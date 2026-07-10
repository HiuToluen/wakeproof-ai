import { assertNoActiveAlarmSession } from '../services/alarmMutationGuard';
import { getDatabase } from './database';

function parseRepeatDays(value) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function mapAlarmRow(row) {
  return { id: row.id, title: row.title, hour: row.hour, minute: row.minute, repeatDays: parseRepeatDays(row.repeat_days), isEnabled: Boolean(row.is_enabled), snoozeDuration: row.snooze_duration, maxSnooze: row.max_snooze, challengeMode: row.challenge_mode, ringtoneId: row.ringtone_id ?? 'BRR_BRR_PATAPIM', notificationId: row.notification_id ?? null, nextTriggerAt: row.next_trigger_at ?? null, createdAt: row.created_at, updatedAt: row.updated_at };
}

function getAlarmParams(alarm) {
  return [alarm.title, alarm.hour, alarm.minute, JSON.stringify(alarm.repeatDays), alarm.isEnabled ? 1 : 0, alarm.snoozeDuration, alarm.maxSnooze, alarm.challengeMode, alarm.ringtoneId, alarm.notificationId ?? null, alarm.nextTriggerAt ?? null, alarm.createdAt, alarm.updatedAt];
}

export async function getAllAlarms() {
  try { const database = await getDatabase(); return (await database.getAllAsync('SELECT * FROM alarms ORDER BY hour ASC, minute ASC, created_at ASC')).map(mapAlarmRow); }
  catch (error) { throw new Error(`Unable to load alarms: ${error.message}`); }
}

export async function getAlarmById(id) {
  try { const database = await getDatabase(); const row = await database.getFirstAsync('SELECT * FROM alarms WHERE id = ?', [id]); return row ? mapAlarmRow(row) : null; }
  catch (error) { throw new Error(`Unable to load alarm: ${error.message}`); }
}

export async function createAlarm(alarm) {
  try {
    await assertNoActiveAlarmSession();
    const database = await getDatabase();
    await database.runAsync(`INSERT INTO alarms (id, title, hour, minute, repeat_days, is_enabled, snooze_duration, max_snooze, challenge_mode, ringtone_id, notification_id, next_trigger_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [alarm.id, ...getAlarmParams(alarm)]);
    return getAlarmById(alarm.id);
  } catch (error) { throw new Error(`Unable to create alarm: ${error.message}`); }
}

export async function updateAlarm(id, alarm) {
  try {
    await assertNoActiveAlarmSession();
    const database = await getDatabase();
    const result = await database.runAsync(`UPDATE alarms SET title = ?, hour = ?, minute = ?, repeat_days = ?, is_enabled = ?, snooze_duration = ?, max_snooze = ?, challenge_mode = ?, ringtone_id = ?, notification_id = ?, next_trigger_at = ?, created_at = ?, updated_at = ? WHERE id = ?`, [...getAlarmParams(alarm), id]);
    if (result.changes === 0) throw new Error('Alarm not found.');
    return getAlarmById(id);
  } catch (error) { throw new Error(`Unable to update alarm: ${error.message}`); }
}

export async function deleteAlarm(id) {
  try { await assertNoActiveAlarmSession(); const database = await getDatabase(); const result = await database.runAsync('DELETE FROM alarms WHERE id = ?', [id]); if (result.changes === 0) throw new Error('Alarm not found.'); }
  catch (error) { throw new Error(`Unable to delete alarm: ${error.message}`); }
}

export async function setAlarmEnabled(id, isEnabled) {
  try { await assertNoActiveAlarmSession(); const database = await getDatabase(); const result = await database.runAsync('UPDATE alarms SET is_enabled = ?, updated_at = ? WHERE id = ?', [isEnabled ? 1 : 0, new Date().toISOString(), id]); if (result.changes === 0) throw new Error('Alarm not found.'); }
  catch (error) { throw new Error(`Unable to update alarm status: ${error.message}`); }
}

export async function updateAlarmSchedule(id, notificationId, nextTriggerAt) {
  try { const database = await getDatabase(); await database.runAsync('UPDATE alarms SET notification_id = ?, next_trigger_at = ?, updated_at = ? WHERE id = ?', [notificationId ?? null, nextTriggerAt ?? null, new Date().toISOString(), id]); }
  catch (error) { throw new Error(`Unable to update alarm schedule: ${error.message}`); }
}

export async function duplicateAlarm(id) {
  try {
    await assertNoActiveAlarmSession();
    const original = await getAlarmById(id);
    if (!original) throw new Error('Alarm not found.');
    const now = new Date().toISOString();
    const copy = { ...original, id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, title: `${original.title} Copy`, isEnabled: false, notificationId: null, nextTriggerAt: null, createdAt: now, updatedAt: now };
    return createAlarm(copy);
  } catch (error) { throw new Error(`Unable to duplicate alarm: ${error.message}`); }
}

export async function disableAlarmAndClearSchedule(id) {
  try { const database = await getDatabase(); await database.runAsync('UPDATE alarms SET is_enabled = 0, notification_id = NULL, next_trigger_at = NULL, updated_at = ? WHERE id = ?', [new Date().toISOString(), id]); }
  catch (error) { throw new Error(`Unable to disable alarm: ${error.message}`); }
}
