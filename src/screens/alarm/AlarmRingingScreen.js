import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, Vibration, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import MockAdOverlay from '../../components/ads/MockAdOverlay';
import PrimaryButton from '../../components/common/PrimaryButton';
import SecondaryButton from '../../components/common/SecondaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { ALARM_SESSION_STATUS, CHALLENGE_STATUS } from '../../constants/alarmConstants';
import { snoozeCreditCost } from '../../constants/premiumConstants';
import { getAlarmById } from '../../database/alarmRepository';
import { clearExpiredChallengeLockout, getAlarmSessionById, getQueuedSessionCount, snoozeAlarmSession, startChallengeSession, updateChallengeStatus } from '../../database/alarmSessionRepository';
import { useCredits } from '../../hooks/useCredits';
import { usePremium } from '../../hooks/usePremium';
import { restartAlarmPlayback, stopAlarmPlayback } from '../../services/alarmAudioService';
import { assignChallengeToSession } from '../../services/challengeService';
import { cancelPendingSnoozeForSession, scheduleSnoozeNotification } from '../../services/alarmSchedulerService';
import { useTheme } from '../../hooks/useTheme';
import { formatTime, getRepeatDaysSummary } from '../../utils/dateTime';

const VIBRATION_PATTERN = [0, 700, 300, 700, 300, 1200];

function startAlarmVibration() {
  Vibration.cancel();
  Vibration.vibrate(VIBRATION_PATTERN, true);
}

export default function AlarmRingingScreen({ navigation, route }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { alarmId, sessionId } = route.params;
  const [alarm, setAlarm] = useState(null);
  const [session, setSession] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [queuedCount, setQueuedCount] = useState(0);
  const allowNavigation = useRef(false);

  // Premium status (MOCK IAP) and snooze credits (Firestore for authed, SQLite for guest).
  const { isPremium } = usePremium();
  const { spendForSnooze, watchAdAndEarn } = useCredits();

  // MOCK: inline sequential ad overlay state for the credit-gated snooze flow.
  // When a free user lacks credits, `totalAds` mock ads are shown one after
  // another. `currentAdIndex` drives both the "Ad N of M" label and the React
  // `key` used to remount the overlay (resetting its countdown) between ads.
  const [adVisible, setAdVisible] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [totalAds, setTotalAds] = useState(0);

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

  // Executes the actual snooze (shared by all snooze paths): schedules the
  // re-ring notification using the alarm's configured snoozeDuration, marks the
  // session as SNOOZING in the database, and stops playback. The credit/ad
  // gating is layered on top without modifying any of this behaviour.
  const executeSnooze = useCallback(async () => {
    const snoozeSchedule = await scheduleSnoozeNotification(session, alarm, alarm.snoozeDuration);
    await snoozeAlarmSession(session.id, snoozeSchedule.snoozeUntil);
    await stopRinging();
    setSession((current) => ({ ...current, status: ALARM_SESSION_STATUS.SNOOZING, snoozeCount: current.snoozeCount + 1, snoozeUntil: snoozeSchedule.snoozeUntil }));
  }, [alarm, session, stopRinging]);

  // Clears all ad overlay state. Called on cancel and after the final ad.
  const resetAdState = useCallback(() => {
    setAdVisible(false);
    setCurrentAdIndex(0);
    setTotalAds(0);
  }, []);

  // Called after the user watches every deficit ad: spends the snooze cost and
  // proceeds to the actual snooze.
  const completeSnoozeAfterAds = useCallback(async () => {
    try {
      const spendResult = await spendForSnooze(session.snoozeCount);
      if (!spendResult.success) {
        // Should not happen after earning the deficit, but handle gracefully.
        const cost = snoozeCreditCost(session.snoozeCount);
        Alert.alert('Unable to snooze', `Need ${cost} snooze credits. Please try again.`);
        setProcessing(false);
        return;
      }
      await executeSnooze();
    } catch (error) {
      Alert.alert('Unable to snooze', error.message);
      setProcessing(false);
      await restartAlarmPlayback(sessionId, alarm.ringtoneId).catch(() => {});
      startAlarmVibration();
    }
  }, [alarm, executeSnooze, sessionId, session, spendForSnooze]);

  // Called when the user finishes one mock ad (taps Close after the countdown).
  // Earns 1 credit, then either advances to the next ad or completes the snooze.
  const handleAdComplete = useCallback(async () => {
    try {
      // MOCK: grant one snooze credit for watching the ad.
      await watchAdAndEarn();
    } catch (error) {
      Alert.alert('Unable to earn credit', error.message);
      resetAdState();
      setProcessing(false);
      return;
    }

    const nextIndex = currentAdIndex + 1;
    if (nextIndex >= totalAds) {
      // All deficit ads watched: spend credits and snooze.
      resetAdState();
      await completeSnoozeAfterAds();
    } else {
      // Advance to the next ad. The `key` prop on MockAdOverlay forces a full
      // remount so the countdown timer resets for the next ad.
      setCurrentAdIndex(nextIndex);
    }
  }, [completeSnoozeAfterAds, currentAdIndex, resetAdState, totalAds, watchAdAndEarn]);

  // Called when the user dismisses the ad via the back gesture (onCancel).
  // Aborts the snooze; credits earned from already-watched ads are retained.
  const handleAdCancel = useCallback(() => {
    resetAdState();
    setProcessing(false);
  }, [resetAdState]);

  const snooze = async () => {
    if (!alarm || !session || processing || session.snoozeCount >= alarm.maxSnooze) return;
    setProcessing(true);
    try {
      // 1. Premium users snooze directly: no credits deducted, no ads shown.
      if (isPremium) {
        await executeSnooze();
        return;
      }

      // 2. Free users: attempt to spend credits. snoozeCreditCost(n) = n + 1,
      //    so the 1st snooze costs 1 credit, the 2nd costs 2, etc.
      //    spendForSnooze reads the authoritative balance and returns the
      //    deficit when the balance is insufficient.
      const spendResult = await spendForSnooze(session.snoozeCount);

      // 3. Enough credits: deduct and snooze immediately (no ads).
      if (spendResult.success) {
        await executeSnooze();
        return;
      }

      // 4. Insufficient credits: show mock ads to cover the deficit. Each ad
      //    completion earns 1 credit via handleAdComplete -> watchAdAndEarn.
      //    After `deficit` ads the balance covers the cost and the snooze
      //    proceeds via completeSnoozeAfterAds.
      const deficit = spendResult.deficit;
      if (deficit <= 0) {
        // Defensive guard: no deficit means the spend should have succeeded.
        await executeSnooze();
        return;
      }
      setTotalAds(deficit);
      setCurrentAdIndex(0);
      setAdVisible(true);
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
  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Text style={styles.clock}>{formatTime(now.getHours(), now.getMinutes())}</Text>
        <Text style={styles.title}>{alarm.title}</Text>
        <Text style={styles.message}>{getRepeatDaysSummary(alarm.repeatDays)}</Text>
        {session.status === ALARM_SESSION_STATUS.SNOOZING ? <Text style={styles.waiting}>Snoozing: {Math.floor(snoozeSeconds / 60)}:{String(snoozeSeconds % 60).padStart(2, '0')}</Text> : null}
        {lockSeconds > 0 ? <><Text style={styles.locked}>Challenge locked</Text><Text style={styles.locked}>Available again in {Math.floor(lockSeconds / 60)}:{String(lockSeconds % 60).padStart(2, '0')}</Text></> : null}
        <Text style={styles.message}>Snoozes: {session.snoozeCount} of {alarm.maxSnooze}</Text>
        {queuedCount > 0 ? <Text style={styles.waiting}>{queuedCount} alarm{queuedCount === 1 ? '' : 's'} waiting</Text> : null}
        <PrimaryButton title={lockSeconds > 0 ? 'Challenge temporarily locked' : 'Start Wake Challenge'} onPress={startChallenge} disabled={processing || lockSeconds > 0} style={styles.challenge} />
        {session.status === ALARM_SESSION_STATUS.RINGING && session.snoozeCount < alarm.maxSnooze ? <SecondaryButton title={processing ? 'Processing...' : 'Snooze'} onPress={snooze} disabled={processing} style={styles.snooze} /> : null}
      </View>
      {/* MOCK: inline sequential mock reward-ad overlay for credit-gated snooze (class project). */}
      <MockAdOverlay
        key={currentAdIndex}
        visible={adVisible}
        adNumber={currentAdIndex + 1}
        totalAds={totalAds}
        onAdComplete={handleAdComplete}
        onCancel={handleAdCancel}
      />
    </ScreenContainer>
  );
}

const createStyles = ({ colors, spacing, typography }) => StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  // Big clock kept in primary — high-contrast branded accent, readable in both modes
  clock: { color: colors.primary, fontSize: 64, fontWeight: '700' },
  title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.lg },
  message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  // "N alarms waiting" and snooze countdown — informational, use warning
  waiting: { ...typography.label, color: colors.warning, marginTop: spacing.md },
  // "Challenge locked" — blocking action state, use danger
  locked: { ...typography.label, color: colors.danger, marginTop: spacing.md },
  challenge: { marginTop: spacing.xxl, width: '100%' },
  snooze: { marginTop: spacing.md, width: '100%' },
});
