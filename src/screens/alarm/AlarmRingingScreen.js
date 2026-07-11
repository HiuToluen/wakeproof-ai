import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, Vibration, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import PrimaryButton from '../../components/common/PrimaryButton';
import SecondaryButton from '../../components/common/SecondaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { ALARM_SESSION_STATUS, CHALLENGE_STATUS } from '../../constants/alarmConstants';
import { getAlarmById } from '../../database/alarmRepository';
import { clearExpiredChallengeLockout, getAlarmSessionById, getQueuedSessionCount, snoozeAlarmSession, startChallengeSession, updateChallengeStatus } from '../../database/alarmSessionRepository';
import { restartAlarmPlayback, stopAlarmPlayback } from '../../services/alarmAudioService';
import { assignChallengeToSession } from '../../services/challengeService';
import { cancelPendingSnoozeForSession, scheduleSnoozeNotification } from '../../services/alarmSchedulerService';
import { colors, spacing, typography } from '../../theme';
import { formatTime, getRepeatDaysSummary } from '../../utils/dateTime';

const VIBRATION_PATTERN = [0, 700, 300, 700, 300, 1200];

function startAlarmVibration() {
  Vibration.cancel();
  Vibration.vibrate(VIBRATION_PATTERN, true);
}

export default function AlarmRingingScreen({ navigation, route }) {
  const { alarmId, sessionId } = route.params;
  const [alarm, setAlarm] = useState(null);
  const [session, setSession] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [queuedCount, setQueuedCount] = useState(0);
  const allowNavigation = useRef(false);

  const stopRinging = useCallback(async () => {
    Vibration.cancel();
    await stopAlarmPlayback(sessionId);
  }, [sessionId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    allowNavigation.current = false;
    setProcessing(false);

    const activateRinging = async () => {
      try {
        const [loadedAlarm, rawSession, waitingCount] = await Promise.all([getAlarmById(alarmId), getAlarmSessionById(sessionId), getQueuedSessionCount()]);
        if (!loadedAlarm || !rawSession) throw new Error('Alarm session could not be loaded.');
        const loadedSession = await clearExpiredChallengeLockout(sessionId);
        if (!active) return;
        setAlarm(loadedAlarm);
        setQueuedCount(waitingCount);
        setSession(loadedSession);
        if (loadedSession.status === ALARM_SESSION_STATUS.SNOOZING) {
      const latestSession = await clearExpiredChallengeLockout(sessionId);
      if (latestSession.challengeLockedUntil && new Date(latestSession.challengeLockedUntil).getTime() > Date.now()) throw new Error('Challenge is temporarily locked. Keep waking up and try again shortly.');
      setSession(latestSession);
      await stopRinging();
          return;
        }
        if (loadedSession.status !== ALARM_SESSION_STATUS.RINGING) return;
        if (loadedSession.challengeStatus !== CHALLENGE_STATUS.NOT_STARTED) await updateChallengeStatus(sessionId, CHALLENGE_STATUS.NOT_STARTED);
        await restartAlarmPlayback(sessionId, loadedAlarm.ringtoneId);
        if (active) startAlarmVibration();
      } catch (error) {
        if (active) Alert.alert('Unable to open alarm', error.message);
      }
    };

    activateRinging();
    const clock = setInterval(() => { setNow(new Date()); getQueuedSessionCount().then((count) => { if (active) setQueuedCount(count); }).catch(() => {}); }, 1000);
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!allowNavigation.current) event.preventDefault();
    });

    return () => {
      active = false;
      clearInterval(clock);
      unsubscribe();
    };
  }, [alarmId, navigation, sessionId]));

  const snooze = async () => {
    if (!alarm || !session || processing || session.snoozeCount >= alarm.maxSnooze) return;
    setProcessing(true);
    try {
      const snoozeSchedule = await scheduleSnoozeNotification(session, alarm, alarm.snoozeDuration);
      await snoozeAlarmSession(session.id, snoozeSchedule.snoozeUntil);
      await stopRinging();
      setSession((current) => ({ ...current, status: ALARM_SESSION_STATUS.SNOOZING, snoozeCount: current.snoozeCount + 1, snoozeUntil: snoozeSchedule.snoozeUntil }));
    } catch (error) {
      Alert.alert('Unable to snooze', error.message);
      setProcessing(false);
      await restartAlarmPlayback(sessionId, alarm.ringtoneId).catch(() => {});
      startAlarmVibration();
    }
  };

  const startChallenge = async () => {
    if (!alarm || !session || processing) return;
    setProcessing(true);
    try {
      await stopRinging();
      if (session.status === ALARM_SESSION_STATUS.SNOOZING) await cancelPendingSnoozeForSession(sessionId);
      await assignChallengeToSession(sessionId);
      await startChallengeSession(sessionId);
      allowNavigation.current = true;
      navigation.replace('ChallengeInstruction', { alarmId, sessionId });
    } catch (error) {
      Alert.alert('Unable to start challenge', error.message);
      setProcessing(false);
      await restartAlarmPlayback(sessionId, alarm.ringtoneId).catch(() => {});
      startAlarmVibration();
    }
  };

  if (!alarm || !session) return <ScreenContainer><View style={styles.center}><Text style={styles.message}>Loading alarm...</Text></View></ScreenContainer>;
  const snoozeSeconds = session.snoozeUntil ? Math.max(0, Math.ceil((new Date(session.snoozeUntil).getTime() - now.getTime()) / 1000)) : 0;
  const lockSeconds = session.challengeLockedUntil ? Math.max(0, Math.ceil((new Date(session.challengeLockedUntil).getTime() - now.getTime()) / 1000)) : 0;
  return <ScreenContainer><View style={styles.center}><Text style={styles.clock}>{formatTime(now.getHours(), now.getMinutes())}</Text><Text style={styles.title}>{alarm.title}</Text><Text style={styles.message}>{getRepeatDaysSummary(alarm.repeatDays)}</Text>{session.status === ALARM_SESSION_STATUS.SNOOZING ? <Text style={styles.waiting}>Snoozing: {Math.floor(snoozeSeconds / 60)}:{String(snoozeSeconds % 60).padStart(2, '0')}</Text> : null}{lockSeconds > 0 ? <><Text style={styles.waiting}>Challenge locked</Text><Text style={styles.waiting}>Available again in {Math.floor(lockSeconds / 60)}:{String(lockSeconds % 60).padStart(2, '0')}</Text></> : null}<Text style={styles.message}>Snoozes: {session.snoozeCount} of {alarm.maxSnooze}</Text>{queuedCount > 0 ? <Text style={styles.waiting}>{queuedCount} alarm{queuedCount === 1 ? '' : 's'} waiting</Text> : null}<PrimaryButton title={lockSeconds > 0 ? 'Challenge temporarily locked' : 'Start Wake Challenge'} onPress={startChallenge} disabled={processing || lockSeconds > 0} style={styles.challenge} />{session.status === ALARM_SESSION_STATUS.RINGING && session.snoozeCount < alarm.maxSnooze ? <SecondaryButton title={processing ? 'Processing...' : 'Snooze'} onPress={snooze} disabled={processing} style={styles.snooze} /> : null}</View></ScreenContainer>;
}

const styles = StyleSheet.create({ center: { alignItems: 'center', flex: 1, justifyContent: 'center' }, clock: { color: colors.primary, fontSize: 64, fontWeight: '700' }, title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.lg }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm }, waiting: { ...typography.label, color: colors.danger, marginTop: spacing.md }, challenge: { marginTop: spacing.xxl, width: '100%' }, snooze: { marginTop: spacing.md, width: '100%' } });
