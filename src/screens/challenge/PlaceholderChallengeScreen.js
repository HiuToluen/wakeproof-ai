import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

import ScreenContainer from '../../components/common/ScreenContainer';
import SecondaryButton from '../../components/common/SecondaryButton';
import { disableAlarmAndClearSchedule, getAlarmById } from '../../database/alarmRepository';
import { completeSessionAndActivateNext, getQueuedSessionCount } from '../../database/alarmSessionRepository';
import { forceStopAlarmPlayback } from '../../services/alarmAudioService';
import { useTheme } from '../../hooks/useTheme';
import { returnChallengeToRinging } from '../../services/challengeFlowService';

const HOLD_DURATION_MS = 5000;
const PLACEHOLDER_CHALLENGE_TIMEOUT_SECONDS = 30;

export default function PlaceholderChallengeScreen({ navigation, route }) {
  const { alarmId, preview = false, sessionId } = route.params;
  const [alarm, setAlarm] = useState(null);
  const [progress, setProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(PLACEHOLDER_CHALLENGE_TIMEOUT_SECONDS);
  const [processing, setProcessing] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const startedAt = useRef(null);
  const holdTimer = useRef(null);
  const countdownTimer = useRef(null);
  const allowNavigation = useRef(false);
  const transitionStarted = useRef(false);

  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    startedAt.current = null;
  }, []);

  const clearChallengeTimers = useCallback(() => {
    clearHoldTimer();
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    countdownTimer.current = null;
  }, [clearHoldTimer]);

  const returnToRinging = useCallback(async () => {
    if (transitionStarted.current) return;
    transitionStarted.current = true;
    setProcessing(true);
    clearChallengeTimers();
    await forceStopAlarmPlayback();
    Vibration.cancel();
    if (preview) {
      allowNavigation.current = true;
      navigation.goBack();
      return;
    }
    try {
      await returnChallengeToRinging(sessionId, 'recovery');
      allowNavigation.current = true;
    } catch (error) {
      transitionStarted.current = false;
      setProcessing(false);
      Alert.alert('Unable to return to alarm', error.message);
    }
  }, [clearChallengeTimers, navigation, preview, sessionId]);

  useEffect(() => {
    let mounted = true;
    forceStopAlarmPlayback().catch(() => {});
    Vibration.cancel();
    getAlarmById(alarmId).then((loadedAlarm) => { if (mounted) setAlarm(loadedAlarm); }).catch((error) => Alert.alert('Unable to load challenge', error.message));

    getQueuedSessionCount().then((count) => { if (mounted) setQueuedCount(count); }).catch(() => {});
    countdownTimer.current = setInterval(() => {
      getQueuedSessionCount().then((count) => { if (mounted) setQueuedCount(count); }).catch(() => {});
      setRemainingSeconds((current) => {
        if (current <= 1) {
          returnToRinging();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowNavigation.current || transitionStarted.current) return;
      event.preventDefault();
      returnToRinging();
    });

    return () => {
      mounted = false;
      clearChallengeTimers();
      unsubscribe();
    };
  }, [alarmId, clearChallengeTimers, navigation, returnToRinging]);

  const complete = useCallback(async () => {
    if (transitionStarted.current) return;
    transitionStarted.current = true;
    setProcessing(true);
    clearChallengeTimers();
    await forceStopAlarmPlayback();
    Vibration.cancel();
    try {
      if (preview) {
        allowNavigation.current = true;
        Alert.alert('Challenge preview complete', 'You completed the preview wake challenge.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        return;
      }
      const nextSession = await completeSessionAndActivateNext(sessionId);
      if (alarm?.repeatDays.length === 0) await disableAlarmAndClearSchedule(alarm.id);
      allowNavigation.current = true;
      Alert.alert('Challenge complete', nextSession ? 'The next queued alarm is starting.' : 'You completed your wake challenge.');
    } catch (error) {
      transitionStarted.current = false;
      setProcessing(false);
      Alert.alert('Unable to complete challenge', error.message);
    }
  }, [alarm, clearChallengeTimers, navigation, preview, sessionId]);

  const resetHold = () => {
    clearHoldTimer();
    if (!processing) setProgress(0);
  };

  const startHold = () => {
    if (processing || holdTimer.current) return;
    startedAt.current = Date.now();
    holdTimer.current = setInterval(() => {
      const next = Math.min(1, (Date.now() - startedAt.current) / HOLD_DURATION_MS);
      setProgress(next);
      if (next >= 1) complete();
    }, 100);
  };

  return <ScreenContainer><View style={styles.content}><Text style={styles.heading}>{alarm?.title || 'Wake Challenge'}</Text><Text style={styles.countdown}>Time remaining: {remainingSeconds}s</Text>{queuedCount > 0 ? <Text style={styles.waiting}>{queuedCount} alarm{queuedCount === 1 ? '' : 's'} waiting</Text> : null}<Text style={styles.message}>Camera and AI verification will be added later.</Text><Text style={styles.instruction}>Stand up and hold the button for 5 seconds.</Text><Pressable onPressIn={startHold} onPressOut={resetHold} disabled={processing} style={({ pressed }) => [styles.holdButton, pressed && styles.pressed]}><Text style={styles.buttonText}>{processing ? 'Processing...' : `Hold ${Math.round(progress * 100)}%`}</Text><View style={[styles.progress, { width: `${progress * 100}%` }]} /></Pressable><SecondaryButton title="Back" onPress={returnToRinging} disabled={processing} style={styles.back} /></View></ScreenContainer>;
}

const createStyles = ({ colors, spacing, typography, radius }) => StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  heading: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  countdown: { ...typography.heading, color: colors.danger, marginTop: spacing.lg, textAlign: 'center' },
  waiting: { ...typography.label, color: colors.danger, marginTop: spacing.sm, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  instruction: { ...typography.label, color: colors.textPrimary, marginTop: spacing.xl, textAlign: 'center' },
  holdButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, marginTop: spacing.xl, overflow: 'hidden', padding: spacing.lg },
  back: { marginTop: spacing.md },
  pressed: { backgroundColor: colors.primaryPressed },
  buttonText: { ...typography.label, color: colors.onPrimary, zIndex: 1 },
  progress: { backgroundColor: colors.primaryPressed, bottom: 0, left: 0, position: 'absolute', top: 0 },
});
