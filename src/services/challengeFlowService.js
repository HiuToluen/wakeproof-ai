import { Vibration } from 'react-native';

import { ALARM_SESSION_STATUS, CHALLENGE_STATUS } from '../constants/alarmConstants';
import { getAlarmById } from '../database/alarmRepository';
import { updateAlarmSessionStatus, updateChallengeStatus } from '../database/alarmSessionRepository';
import { forceStopAlarmPlayback, restartAlarmPlayback } from './alarmAudioService';

export const VIBRATION_PATTERN = [0, 700, 300, 700, 300, 1200];

export async function returnChallengeToRinging(sessionId, options = {}) {
  const { restartAlerts = true } = options;
  await updateChallengeStatus(sessionId, CHALLENGE_STATUS.NOT_STARTED);
  const session = await updateAlarmSessionStatus(sessionId, ALARM_SESSION_STATUS.RINGING);
  if (restartAlerts) {
    const alarm = await getAlarmById(session.alarmId);
    if (alarm) await restartAlarmPlayback(sessionId, alarm.ringtoneId);
    Vibration.cancel();
    Vibration.vibrate(VIBRATION_PATTERN, true);
  }
  return session;
}

export async function stopChallengeAlerts() {
  await forceStopAlarmPlayback();
  Vibration.cancel();
}
