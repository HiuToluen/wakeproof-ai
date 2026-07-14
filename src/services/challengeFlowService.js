import { Vibration } from 'react-native';

import { ALARM_SESSION_STATUS } from '../constants/alarmConstants';
import { getAlarmSessionById, returnChallengeSessionToRinging } from '../database/alarmSessionRepository';
import { forceStopAlarmPlayback } from './alarmAudioService';
import { requestActiveSessionRefresh } from './activeSessionRefreshService';

export const VIBRATION_PATTERN = [0, 700, 300, 700, 300, 1200];

function getReconcileAction(session) {
  if (!session) return 'missing-session';
  if (session.status === ALARM_SESSION_STATUS.RINGING) return 'switch-ringing';
  if (session.status === ALARM_SESSION_STATUS.SNOOZING) return 'switch-snoozing';
  if (session.status === ALARM_SESSION_STATUS.COMPLETED || session.status === ALARM_SESSION_STATUS.CANCELLED) return 'exit-completed';
  if (session.status === ALARM_SESSION_STATUS.CHALLENGE_ACTIVE) return 'stay-challenge';
  return 'missing-session';
}

export async function returnActiveChallengeSessionToRinging(sessionId, reason) {
  const previousSession = await getAlarmSessionById(sessionId);
  if (!previousSession) {
    const refreshedSession = await requestActiveSessionRefresh();
    if (__DEV__) console.log('[challenge-return-to-ringing]', { sessionId, reason, previousStatus: null, persistedStatus: null, refreshedStatus: refreshedSession?.status ?? null });
    return refreshedSession;
  }
  const { session } = previousSession.status === ALARM_SESSION_STATUS.CHALLENGE_ACTIVE
    ? await returnChallengeSessionToRinging(sessionId, { incrementTimeout: reason === 'timeout' })
    : { session: previousSession };
  const refreshedSession = await requestActiveSessionRefresh();
  if (__DEV__) console.log('[challenge-return-to-ringing]', { sessionId, reason, previousStatus: previousSession.status, persistedStatus: session?.status ?? null, refreshedStatus: refreshedSession?.status ?? null });
  return refreshedSession ?? session;
}

export const returnChallengeToRinging = returnActiveChallengeSessionToRinging;

export async function reconcileChallengeScreenSession(sessionId, route = 'unknown') {
  const session = await getAlarmSessionById(sessionId);
  const action = getReconcileAction(session);
  if (__DEV__) console.log('[challenge-reconcile]', { sessionId, route, persistedStatus: session?.status ?? null, action });
  const refreshedSession = action === 'stay-challenge' ? session : await requestActiveSessionRefresh();
  return { action, session, refreshedSession };
}

export function isChallengePenaltyActive(session) {
  return (session?.challengeTimeoutCount ?? 0) >= 2;
}

export async function prepareChallengeAlerts(sessionId, preview = false) {
  if (!preview) {
    const session = await getAlarmSessionById(sessionId);
    if (isChallengePenaltyActive(session)) return { penaltyActive: true, session };
  }
  await forceStopAlarmPlayback();
  Vibration.cancel();
  return { penaltyActive: false };
}

export async function stopChallengeAlerts(options = {}) {
  await forceStopAlarmPlayback(options);
  Vibration.cancel();
}
