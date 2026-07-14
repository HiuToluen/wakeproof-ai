import { ALARM_SESSION_STATUS } from '../constants/alarmConstants';
import { NOTIFICATION_TYPES } from '../constants/notificationConstants';
import { getAlarmById } from '../database/alarmRepository';
import { activateQueuedSession, createOrQueueAlarmOccurrence, getActiveAlarmSession, getAlarmSessionById, getOldestQueuedSession, returnChallengeSessionToRinging, updateAlarmSessionStatus } from '../database/alarmSessionRepository';
import { handleTriggeredAlarmSchedule } from './alarmSchedulerService';

function buildOccurrenceKey(alarmId, scheduledAt, type, sessionId) {
  if (type === NOTIFICATION_TYPES.ALARM_SNOOZE && sessionId) return `snooze:${sessionId}:${scheduledAt}`;
  return `${alarmId}:${scheduledAt}`;
}

export async function enqueueAlarmOccurrence(alarm, data, scheduledAt) {
  if (data.type === NOTIFICATION_TYPES.ALARM_SNOOZE && data.sessionId) {
    const snoozedSession = await getAlarmSessionById(data.sessionId);
    if (!snoozedSession || snoozedSession.status !== ALARM_SESSION_STATUS.SNOOZING) return { session: snoozedSession, shouldNavigate: false };
    const active = await getActiveAlarmSession();
    if (active?.id === snoozedSession.id) {
      const session = await updateAlarmSessionStatus(snoozedSession.id, ALARM_SESSION_STATUS.RINGING);
      return { session, shouldNavigate: true };
    }
    return { session: snoozedSession, shouldNavigate: false };
  }

  const now = new Date().toISOString();
  const occurrenceKey = buildOccurrenceKey(alarm.id, scheduledAt, data.type, data.sessionId);
  const session = await createOrQueueAlarmOccurrence({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, alarmId: alarm.id, occurrenceKey, scheduledAt, triggeredAt: now, createdAt: now, updatedAt: now });
  return { session, shouldNavigate: session?.status === ALARM_SESSION_STATUS.RINGING };
}

export async function activateNextQueuedSession() {
  const active = await getActiveAlarmSession();
  if (active) return active;
  const queued = await getOldestQueuedSession();
  return queued ? activateQueuedSession(queued.id) : null;
}

export async function restoreAlarmQueue() {
  let active = await getActiveAlarmSession();
  while (active && !(await getAlarmById(active.alarmId))) {
    await updateAlarmSessionStatus(active.id, ALARM_SESSION_STATUS.CANCELLED);
    active = await activateNextQueuedSession();
  }
  if (active?.status === ALARM_SESSION_STATUS.CHALLENGE_ACTIVE) {
    const recovered = await returnChallengeSessionToRinging(active.id);
    active = recovered.session;
    if (__DEV__) console.log('[challenge-return-to-ringing]', { sessionId: active?.id ?? null, reason: 'recovery', previousStatus: ALARM_SESSION_STATUS.CHALLENGE_ACTIVE, persistedStatus: active?.status ?? null, refreshedStatus: active?.status ?? null });
  }
  if (active?.status === ALARM_SESSION_STATUS.SNOOZING && (!active.snoozeUntil || new Date(active.snoozeUntil).getTime() <= Date.now())) {
    active = await updateAlarmSessionStatus(active.id, ALARM_SESSION_STATUS.RINGING);
  }
  return active || activateNextQueuedSession();
}

export async function processAlarmNotificationResponse(response) {
  const data = response?.notification?.request?.content?.data;
  if (!data?.alarmId || !Object.values(NOTIFICATION_TYPES).includes(data.type)) return false;
  const alarm = await getAlarmById(data.alarmId);
  if (!alarm) throw new Error(`Alarm ${data.alarmId} no longer exists.`);
  const scheduledAt = data.scheduledAt || alarm.nextTriggerAt || response.notification.date || new Date().toISOString();
  const result = await enqueueAlarmOccurrence(alarm, data, scheduledAt);
  if (data.type === NOTIFICATION_TYPES.ALARM_TRIGGER) await handleTriggeredAlarmSchedule(alarm);
  return result.shouldNavigate;
}

