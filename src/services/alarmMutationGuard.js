import { getActiveAlarmSession } from '../database/alarmSessionRepository';

export const ACTIVE_ALARM_MUTATION_ERROR = 'Alarm changes are unavailable while an alarm session is active.';

export async function assertNoActiveAlarmSession() {
  const activeSession = await getActiveAlarmSession();
  if (activeSession) throw new Error(ACTIVE_ALARM_MUTATION_ERROR);
}
