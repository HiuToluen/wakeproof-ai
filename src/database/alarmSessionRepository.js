import { ALARM_SESSION_STATUS, CHALLENGE_STATUS } from '../constants/alarmConstants';
import { CHALLENGE_TIMEOUT_SECONDS } from '../constants/challengeConstants';
import { getDatabase } from './database';

const ACTIVE_STATUSES = [ALARM_SESSION_STATUS.RINGING, ALARM_SESSION_STATUS.SNOOZING, ALARM_SESSION_STATUS.CHALLENGE_ACTIVE];

function mapSession(row) {
  return row ? { id: row.id, alarmId: row.alarm_id, occurrenceKey: row.occurrence_key, queuePosition: row.queue_position, queuedAt: row.queued_at, scheduledAt: row.scheduled_at, triggeredAt: row.triggered_at, snoozeUntil: row.snooze_until, activatedAt: row.activated_at, completedAt: row.completed_at, dismissedAt: row.dismissed_at, status: row.status, snoozeCount: row.snooze_count, challengeStatus: row.challenge_status, challengeId: row.challenge_id, challengeType: row.challenge_type, challengeTargetKey: row.challenge_target_key, challengeStartedAt: row.challenge_started_at, challengeDeadlineAt: row.challenge_deadline_at, challengeAttemptCount: row.challenge_attempt_count ?? 0, createdAt: row.created_at, updatedAt: row.updated_at } : null;
}

export async function createAlarmSession(session) {
  const database = await getDatabase();
  await database.runAsync(`INSERT INTO alarm_sessions (id, alarm_id, occurrence_key, queue_position, scheduled_at, triggered_at, snooze_until, dismissed_at, status, snooze_count, challenge_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [session.id, session.alarmId, session.occurrenceKey ?? null, session.queuePosition ?? null, session.scheduledAt ?? null, session.triggeredAt, session.snoozeUntil ?? null, session.dismissedAt ?? null, session.status, session.snoozeCount ?? 0, session.challengeStatus ?? CHALLENGE_STATUS.NOT_STARTED, session.createdAt, session.updatedAt]);
  return getAlarmSessionById(session.id);
}

export async function getAlarmSessionById(id) { const database = await getDatabase(); return mapSession(await database.getFirstAsync('SELECT * FROM alarm_sessions WHERE id = ?', [id])); }
export async function getAlarmSessionByOccurrenceKey(key) { const database = await getDatabase(); return mapSession(await database.getFirstAsync('SELECT * FROM alarm_sessions WHERE occurrence_key = ?', [key])); }

export async function getActiveAlarmSession() {
  const database = await getDatabase();
  return mapSession(await database.getFirstAsync(`SELECT * FROM alarm_sessions WHERE status IN (?, ?, ?) ORDER BY triggered_at ASC, created_at ASC, id ASC LIMIT 1`, ACTIVE_STATUSES));
}

export async function getLatestActiveSessionForAlarm(alarmId) {
  const database = await getDatabase();
  return mapSession(await database.getFirstAsync(`SELECT * FROM alarm_sessions WHERE alarm_id = ? AND status IN (?, ?, ?, ?) ORDER BY triggered_at DESC LIMIT 1`, [alarmId, ...ACTIVE_STATUSES, ALARM_SESSION_STATUS.QUEUED]));
}

export async function getOldestQueuedSession() {
  const database = await getDatabase();
  return mapSession(await database.getFirstAsync(`SELECT * FROM alarm_sessions WHERE status = ? ORDER BY CASE WHEN scheduled_at IS NULL THEN 1 ELSE 0 END, scheduled_at ASC, triggered_at ASC, created_at ASC, id ASC LIMIT 1`, [ALARM_SESSION_STATUS.QUEUED]));
}

export async function getQueuedSessionCount() {
  const database = await getDatabase();
  const row = await database.getFirstAsync('SELECT COUNT(*) AS count FROM alarm_sessions WHERE status = ?', [ALARM_SESSION_STATUS.QUEUED]);
  return row?.count ?? 0;
}

export async function updateAlarmSessionStatus(id, status) {
  const database = await getDatabase(); await database.runAsync('UPDATE alarm_sessions SET status = ?, snooze_until = CASE WHEN ? = ? THEN snooze_until ELSE NULL END, updated_at = ? WHERE id = ?', [status, status, ALARM_SESSION_STATUS.SNOOZING, new Date().toISOString(), id]); return getAlarmSessionById(id);
}

export async function updateChallengeStatus(id, status) { const database = await getDatabase(); await database.runAsync('UPDATE alarm_sessions SET challenge_status = ?, updated_at = ? WHERE id = ?', [status, new Date().toISOString(), id]); return getAlarmSessionById(id); }

export async function startChallengeSession(id, deadlineAt) {
  const database = await getDatabase(); const now = new Date().toISOString(); const deadline = deadlineAt ?? new Date(Date.now() + CHALLENGE_TIMEOUT_SECONDS * 1000).toISOString();
  await database.withTransactionAsync(async () => { await database.runAsync('UPDATE alarm_sessions SET status = ?, challenge_status = ?, challenge_started_at = ?, challenge_deadline_at = ?, snooze_until = NULL, updated_at = ? WHERE id = ?', [ALARM_SESSION_STATUS.CHALLENGE_ACTIVE, CHALLENGE_STATUS.IN_PROGRESS, now, deadline, now, id]); });
  return getAlarmSessionById(id);
}

export async function assignSessionChallenge(sessionId, challenge, startedAt, deadlineAt) {
  const database = await getDatabase(); const now = new Date().toISOString();
  await database.runAsync('UPDATE alarm_sessions SET challenge_id = COALESCE(challenge_id, ?), challenge_type = COALESCE(challenge_type, ?), challenge_target_key = COALESCE(challenge_target_key, ?), challenge_started_at = COALESCE(challenge_started_at, ?), challenge_deadline_at = COALESCE(challenge_deadline_at, ?), updated_at = ? WHERE id = ?', [challenge.id, challenge.type, challenge.targetKey, startedAt, deadlineAt, now, sessionId]);
  return getAlarmSessionById(sessionId);
}

export async function incrementChallengeAttemptCount(sessionId) {
  const database = await getDatabase();
  await database.runAsync('UPDATE alarm_sessions SET challenge_attempt_count = challenge_attempt_count + 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), sessionId]);
  return getAlarmSessionById(sessionId);
}

export async function completeAlarmSession(id) {
  const now = new Date().toISOString(); const database = await getDatabase(); await database.runAsync('UPDATE alarm_sessions SET status = ?, challenge_status = ?, snooze_until = NULL, dismissed_at = ?, completed_at = ?, updated_at = ? WHERE id = ?', [ALARM_SESSION_STATUS.COMPLETED, CHALLENGE_STATUS.COMPLETED, now, now, now, id]); return getAlarmSessionById(id);
}

export async function completeSessionAndActivateNext(id) {
  const database = await getDatabase(); const now = new Date().toISOString(); let nextId;
  await database.withTransactionAsync(async () => {
    await database.runAsync('UPDATE alarm_sessions SET status = ?, challenge_status = ?, snooze_until = NULL, dismissed_at = ?, completed_at = ?, updated_at = ? WHERE id = ?', [ALARM_SESSION_STATUS.COMPLETED, CHALLENGE_STATUS.COMPLETED, now, now, now, id]);
    const queued = await database.getFirstAsync(`SELECT id FROM alarm_sessions WHERE status = ? ORDER BY CASE WHEN scheduled_at IS NULL THEN 1 ELSE 0 END, scheduled_at ASC, triggered_at ASC, created_at ASC, id ASC LIMIT 1`, [ALARM_SESSION_STATUS.QUEUED]);
    if (queued) {
      const activation = await database.runAsync('UPDATE alarm_sessions SET status = ?, challenge_status = ?, queue_position = NULL, snooze_until = NULL, activated_at = ?, updated_at = ? WHERE id = ? AND status = ? AND NOT EXISTS (SELECT 1 FROM alarm_sessions WHERE status IN (?, ?, ?))', [ALARM_SESSION_STATUS.RINGING, CHALLENGE_STATUS.NOT_STARTED, now, now, queued.id, ALARM_SESSION_STATUS.QUEUED, ...ACTIVE_STATUSES]);
      if (activation.changes === 1) nextId = queued.id;
      else nextId = undefined;
    }
  });
  return nextId ? getAlarmSessionById(nextId) : null;
}

export async function snoozeAlarmSession(id, snoozeUntil) {
  const now = new Date().toISOString(); const database = await getDatabase();
  await database.runAsync('UPDATE alarm_sessions SET snooze_count = snooze_count + 1, status = ?, snooze_until = ?, updated_at = ? WHERE id = ?', [ALARM_SESSION_STATUS.SNOOZING, snoozeUntil, now, id]);
  return getAlarmSessionById(id);
}

export async function activateQueuedSession(id) {
  const database = await getDatabase(); const now = new Date().toISOString();
  try {
    await database.runAsync('UPDATE alarm_sessions SET status = ?, challenge_status = ?, queue_position = NULL, snooze_until = NULL, activated_at = ?, updated_at = ? WHERE id = ? AND status = ? AND NOT EXISTS (SELECT 1 FROM alarm_sessions WHERE status IN (?, ?, ?))', [ALARM_SESSION_STATUS.RINGING, CHALLENGE_STATUS.NOT_STARTED, now, now, id, ALARM_SESSION_STATUS.QUEUED, ...ACTIVE_STATUSES]);
  } catch {
    return getActiveAlarmSession();
  }
  return getActiveAlarmSession();
}

export async function createOrQueueAlarmOccurrence(session) {
  const database = await getDatabase();
  try {
    await database.withTransactionAsync(async () => {
      const duplicate = await database.getFirstAsync('SELECT id FROM alarm_sessions WHERE occurrence_key = ?', [session.occurrenceKey]);
      if (duplicate) return;
      const active = await database.getFirstAsync(`SELECT id FROM alarm_sessions WHERE status IN (?, ?, ?) LIMIT 1`, ACTIVE_STATUSES);
      const status = active ? ALARM_SESSION_STATUS.QUEUED : ALARM_SESSION_STATUS.RINGING;
      const queueRow = await database.getFirstAsync('SELECT COALESCE(MAX(queue_position), 0) + 1 AS next_position FROM alarm_sessions WHERE status = ?', [ALARM_SESSION_STATUS.QUEUED]);
      await database.runAsync(`INSERT INTO alarm_sessions (id, alarm_id, occurrence_key, queue_position, queued_at, scheduled_at, triggered_at, snooze_until, activated_at, dismissed_at, status, snooze_count, challenge_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, 0, ?, ?, ?)`, [session.id, session.alarmId, session.occurrenceKey, active ? queueRow.next_position : null, active ? session.createdAt : null, session.scheduledAt, session.triggeredAt, active ? null : session.createdAt, status, CHALLENGE_STATUS.NOT_STARTED, session.createdAt, session.updatedAt]);
    });
  } catch {
    const existing = await getAlarmSessionByOccurrenceKey(session.occurrenceKey);
    if (existing) return existing;
    await database.runAsync(`INSERT INTO alarm_sessions (id, alarm_id, occurrence_key, queue_position, queued_at, scheduled_at, triggered_at, snooze_until, activated_at, dismissed_at, status, snooze_count, challenge_status, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, NULL, NULL, NULL, ?, 0, ?, ?, ?)`, [session.id, session.alarmId, session.occurrenceKey, session.createdAt, session.scheduledAt, session.triggeredAt, ALARM_SESSION_STATUS.QUEUED, CHALLENGE_STATUS.NOT_STARTED, session.createdAt, session.updatedAt]);
  }
  return getAlarmSessionByOccurrenceKey(session.occurrenceKey);
}
