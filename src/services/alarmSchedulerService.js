import * as Notifications from 'expo-notifications';

import { getRingtoneById } from '../constants/alarmConstants';
import { ALARM_NOTIFICATION_CATEGORY_ID, ALARM_NOTIFICATION_CHANNEL_ID, NOTIFICATION_TYPES } from '../constants/notificationConstants';
import { getAllAlarms, updateAlarmSchedule } from '../database/alarmRepository';
import { getLatestActiveSessionForAlarm } from '../database/alarmSessionRepository';
import { getNotificationPermissionStatus, requestNotificationPermissions } from './notificationService';
import { calculateAlarmOccurrence } from '../utils/alarmDateTime';

export function calculateNextAlarmOccurrence(alarm, now = new Date()) { return calculateAlarmOccurrence(alarm, now); }

async function schedule(alarm, type, date, sessionId) {
  const ringtone = getRingtoneById(alarm.ringtoneId);
  const notificationId = await Notifications.scheduleNotificationAsync({ content: { title: alarm.title, body: 'Your WakeProof alarm is ringing.', sound: ringtone.fileName, categoryIdentifier: ALARM_NOTIFICATION_CATEGORY_ID, data: { type, alarmId: alarm.id, scheduledAt: date.toISOString(), ...(sessionId ? { sessionId } : {}) } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: ALARM_NOTIFICATION_CHANNEL_ID } });
  return { notificationId, nextTriggerAt: date.toISOString() };
}

export async function scheduleAlarm(alarm, requestPermission = true) {
  const permission = requestPermission ? await requestNotificationPermissions() : await getNotificationPermissionStatus();
  if (!permission.granted) throw new Error('Notification permission is required to schedule alarms.');
  const result = await schedule(alarm, NOTIFICATION_TYPES.ALARM_TRIGGER, calculateNextAlarmOccurrence(alarm));
  await updateAlarmSchedule(alarm.id, result.notificationId, result.nextTriggerAt);
  return result;
}

export async function cancelAlarmSchedule(alarm) {
  if (alarm.notificationId) await Notifications.cancelScheduledNotificationAsync(alarm.notificationId);
  await updateAlarmSchedule(alarm.id, null, null);
}

export async function rescheduleAlarm(alarm, requestPermission = true) {
  if (alarm.notificationId) await Notifications.cancelScheduledNotificationAsync(alarm.notificationId);
  await updateAlarmSchedule(alarm.id, null, null);
  if (!alarm.isEnabled) return null;
  return scheduleAlarm({ ...alarm, notificationId: null, nextTriggerAt: null }, requestPermission);
}

export async function scheduleSnoozeNotification(session, alarm, snoozeMinutes) {
  const date = new Date(Date.now() + snoozeMinutes * 60 * 1000);
  const result = await schedule(alarm, NOTIFICATION_TYPES.ALARM_SNOOZE, date, session.id);
  return { ...result, snoozeUntil: date.toISOString() };
}

export async function reconcileAlarmSchedules() {
  const permission = await getNotificationPermissionStatus();
  if (!permission.granted) return { available: false, scheduled: 0 };
  const systemRequests = await Notifications.getAllScheduledNotificationsAsync();
  const systemIds = new Set(systemRequests.map((request) => request.identifier));
  const alarms = await getAllAlarms(); let scheduled = 0;
  for (const alarm of alarms) {
    const activeSession = await getLatestActiveSessionForAlarm(alarm.id);
    if (activeSession) {
      continue;
    }
    if (!alarm.isEnabled) {
      if (alarm.notificationId) await Notifications.cancelScheduledNotificationAsync(alarm.notificationId);
      if (alarm.notificationId || alarm.nextTriggerAt) await updateAlarmSchedule(alarm.id, null, null);
      continue;
    }
    const nextTime = alarm.nextTriggerAt ? new Date(alarm.nextTriggerAt).getTime() : NaN;
    if (!alarm.notificationId || !systemIds.has(alarm.notificationId) || !Number.isFinite(nextTime) || nextTime <= Date.now()) {
      await rescheduleAlarm(alarm, false); scheduled += 1;
    }
  }
  return { available: true, scheduled };
}

export async function handleTriggeredAlarmSchedule(alarm) {
  if (alarm.repeatDays.length === 0) await updateAlarmSchedule(alarm.id, null, null);
  else await scheduleAlarm({ ...alarm, notificationId: null, nextTriggerAt: null }, false);
}

export async function cancelPendingSnoozeForSession(sessionId) {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const matchingRequests = requests.filter((request) => request.content.data?.type === NOTIFICATION_TYPES.ALARM_SNOOZE && request.content.data?.sessionId === sessionId);
  await Promise.all(matchingRequests.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}
