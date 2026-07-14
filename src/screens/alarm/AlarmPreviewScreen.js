import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, Vibration, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import PrimaryButton from '../../components/common/PrimaryButton';
import SecondaryButton from '../../components/common/SecondaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { getAlarmById } from '../../database/alarmRepository';
import { restartAlarmPlayback, stopAlarmPlayback } from '../../services/alarmAudioService';
import { assertNoActiveAlarmSession } from '../../services/alarmMutationGuard';
import { CHALLENGE_TIMEOUT_SECONDS, MAX_CHALLENGE_REROLLS } from '../../constants/challengeConstants';
import { selectRandomChallenge } from '../../services/challengeService';
import { useTheme } from '../../hooks/useTheme';

const PREVIEW_VIBRATION = [0, 700, 300, 700, 300, 1200];

export default function AlarmPreviewScreen({ navigation, route }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { alarmId } = route.params ?? {};
  const [alarm, setAlarm] = useState(null);
  const allowNavigation = useRef(false);

  const previewSessionId = `preview:${alarmId}`;
  const stopPreview = useCallback(async () => { Vibration.cancel(); await stopAlarmPlayback(previewSessionId); }, [previewSessionId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    const start = async () => {
      try {
        await assertNoActiveAlarmSession();
        const loadedAlarm = await getAlarmById(alarmId);
        if (!loadedAlarm) throw new Error('Alarm not found.');
        await assertNoActiveAlarmSession();
        if (!active) return;
        setAlarm(loadedAlarm);
        await restartAlarmPlayback(previewSessionId, loadedAlarm.ringtoneId);
        await assertNoActiveAlarmSession();
        Vibration.cancel();
        Vibration.vibrate(PREVIEW_VIBRATION, true);
      } catch (error) { Alert.alert('Preview unavailable', error.message, [{ text: 'OK', onPress: () => navigation.goBack() }]); }
    };
    start();
    const unsubscribe = navigation.addListener('beforeRemove', (event) => { if (!allowNavigation.current) { event.preventDefault(); exitPreview(); } });
    return () => { active = false; unsubscribe(); stopPreview().catch(() => {}); };
  }, [alarmId, navigation, previewSessionId, stopPreview]));

  const exitPreview = async () => { await stopPreview(); allowNavigation.current = true; navigation.goBack(); };
  const startChallengePreview = async () => {
    if (!alarm) return;
    await stopPreview();
    const challenge = selectRandomChallenge({ mode: alarm.challengeMode });
    const now = Date.now();
    allowNavigation.current = true;
    navigation.navigate('PreviewChallengeInstruction', { alarmId, preview: true, challengeMode: alarm.challengeMode, previewRerollCount: 0, previewChallengeHistory: [], challenge: { ...challenge, startedAt: new Date(now).toISOString(), deadlineAt: new Date(now + CHALLENGE_TIMEOUT_SECONDS * 1000).toISOString(), rerollCount: 0, remainingRerolls: MAX_CHALLENGE_REROLLS, challengeHistory: [] } });
  };

  return <ScreenContainer><View style={styles.center}><Text style={styles.preview}>Alarm Preview</Text><Text style={styles.title}>{alarm?.title || 'Loading alarm...'}</Text><Text style={styles.message}>This preview does not create or change an alarm session.</Text><PrimaryButton title="Start Challenge" onPress={startChallengePreview} style={styles.button} /><SecondaryButton title="Exit Preview" onPress={exitPreview} style={styles.exit} /></View></ScreenContainer>;
}

const createStyles = ({ colors, spacing, typography }) => StyleSheet.create({ center: { alignItems: 'center', flex: 1, justifyContent: 'center' }, preview: { ...typography.label, color: colors.primary }, title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.md }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }, button: { marginTop: spacing.xl, width: '100%' }, exit: { marginTop: spacing.md, width: '100%' } });
