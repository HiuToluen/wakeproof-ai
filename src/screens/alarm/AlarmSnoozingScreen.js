import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, Vibration, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { ALARM_SESSION_STATUS } from '../../constants/alarmConstants';
import { getAlarmById } from '../../database/alarmRepository';
import { getAlarmSessionById, getQueuedSessionCount, startChallengeSession } from '../../database/alarmSessionRepository';
import { forceStopAlarmPlayback } from '../../services/alarmAudioService';
import { cancelPendingSnoozeForSession } from '../../services/alarmSchedulerService';
import { colors, spacing, typography } from '../../theme';

export default function AlarmSnoozingScreen({ navigation, route }) {
  const { alarmId, sessionId } = route.params;
  const [alarm, setAlarm] = useState(null);
  const [session, setSession] = useState(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [now, setNow] = useState(new Date());
  const [processing, setProcessing] = useState(false);
  const allowNavigation = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    forceStopAlarmPlayback().catch(() => {});
    Vibration.cancel();
    Promise.all([getAlarmById(alarmId), getAlarmSessionById(sessionId), getQueuedSessionCount()]).then(([loadedAlarm, loadedSession, count]) => { if (!loadedAlarm || loadedSession?.status !== ALARM_SESSION_STATUS.SNOOZING || Number.isNaN(new Date(loadedSession.snoozeUntil).getTime())) throw new Error('Snooze session is invalid.'); if (active) { setAlarm(loadedAlarm); setSession(loadedSession); setQueuedCount(count); } }).catch((error) => Alert.alert('Unable to load snooze', error.message));
    const timer = setInterval(() => { setNow(new Date()); getQueuedSessionCount().then((count) => { if (active) setQueuedCount(count); }).catch(() => {}); }, 1000);
    const unsubscribe = navigation.addListener('beforeRemove', (event) => { if (!allowNavigation.current) event.preventDefault(); });
    return () => { active = false; clearInterval(timer); unsubscribe(); };
  }, [alarmId, navigation, sessionId]));

  const startChallenge = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      await cancelPendingSnoozeForSession(sessionId);
      await startChallengeSession(sessionId);
      allowNavigation.current = true;
    } catch (error) { setProcessing(false); Alert.alert('Unable to start challenge', error.message); }
  };

  if (!alarm || !session) return <ScreenContainer><View style={styles.center}><Text style={styles.message}>Loading snooze...</Text></View></ScreenContainer>;
  const remaining = Math.max(0, Math.ceil((new Date(session.snoozeUntil).getTime() - now.getTime()) / 1000));
  return <ScreenContainer><View style={styles.center}><Text style={styles.status}>Snoozing</Text><Text style={styles.title}>{alarm.title}</Text><Text style={styles.countdown}>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</Text><Text style={styles.message}>Next ring: {new Date(session.snoozeUntil).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.message}>Snoozes: {session.snoozeCount} of {alarm.maxSnooze}</Text>{queuedCount > 0 ? <Text style={styles.waiting}>{queuedCount} alarm{queuedCount === 1 ? '' : 's'} waiting</Text> : null}<PrimaryButton title="Start Challenge Now" onPress={startChallenge} disabled={processing} style={styles.button} /></View></ScreenContainer>;
}

const styles = StyleSheet.create({ center: { alignItems: 'center', flex: 1, justifyContent: 'center' }, status: { ...typography.heading, color: colors.primary }, title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.md }, countdown: { color: colors.textPrimary, fontSize: 56, fontWeight: '700', marginTop: spacing.xl }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm }, waiting: { ...typography.label, color: colors.danger, marginTop: spacing.md }, button: { marginTop: spacing.xl, width: '100%' } });
