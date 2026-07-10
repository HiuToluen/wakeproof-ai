import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { ALARM_NOTIFICATION_CHANNEL_ID } from '../constants/notificationConstants';
import { getActiveAlarmSession } from '../database/alarmSessionRepository';

let configured = false;

function isGranted(permission) {
  return permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export function configureNotificationHandler() {
  if (configured) return;
  Notifications.setNotificationHandler({ handleNotification: async () => { const activeSession = await getActiveAlarmSession().catch(() => null); return { shouldPlaySound: !activeSession, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }; } });
  configured = true;
}

export async function getNotificationPermissionStatus() {
  const permission = await Notifications.getPermissionsAsync();
  return { granted: isGranted(permission), canAskAgain: permission.canAskAgain, status: permission.status };
}

export async function requestNotificationPermissions() {
  let permission = await Notifications.getPermissionsAsync();
  if (!isGranted(permission) && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  return { granted: isGranted(permission), canAskAgain: permission.canAskAgain, status: permission.status };
}

export async function createAndroidAlarmChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ALARM_NOTIFICATION_CHANNEL_ID, { name: 'WakeProof alarms', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 500, 250, 500, 250, 1000], enableVibrate: true, sound: 'default', lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, bypassDnd: false });
}

export function addNotificationReceivedListener(callback) { return Notifications.addNotificationReceivedListener(callback); }
export function addNotificationResponseListener(callback) { return Notifications.addNotificationResponseReceivedListener(callback); }
export function getLastNotificationResponse() { return Notifications.getLastNotificationResponseAsync(); }
export function clearLastNotificationResponse() { return Notifications.clearLastNotificationResponseAsync(); }
export function dismissNotification(notificationId) { return Notifications.dismissNotificationAsync(notificationId); }
