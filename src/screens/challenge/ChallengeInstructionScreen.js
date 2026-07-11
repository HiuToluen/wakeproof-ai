import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import SecondaryButton from '../../components/common/SecondaryButton';
import { assignChallengeToSession } from '../../services/challengeService';
import { returnChallengeToRinging, stopChallengeAlerts } from '../../services/challengeFlowService';
import { colors, spacing, typography } from '../../theme';

function formatRemaining(deadlineAt) {
  const seconds = Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function ChallengeInstructionScreen({ navigation, route }) {
  const { alarmId, sessionId, preview = false } = route.params;
  const [challenge, setChallenge] = useState(null);
  const [remaining, setRemaining] = useState('');
  const transitionStarted = useRef(false);

  const returnToRinging = useCallback(async () => {
    if (transitionStarted.current) return;
    transitionStarted.current = true;
    try {
      if (preview) navigation.popTo('AlarmPreview', { alarmId });
      else await returnChallengeToRinging(sessionId);
    } catch (error) {
      transitionStarted.current = false;
      Alert.alert('Unable to return to alarm', error.message);
    }
  }, [alarmId, navigation, preview, sessionId]);

  useEffect(() => {
    let mounted = true;
    stopChallengeAlerts().catch(() => {});
    if (preview) setChallenge(route.params.challenge);
    else assignChallengeToSession(sessionId).then((assigned) => { if (mounted) setChallenge(assigned); }).catch((error) => Alert.alert('Unable to load challenge', error.message));
    const timer = setInterval(() => {
      if (!challenge?.deadlineAt) return;
      setRemaining(formatRemaining(challenge.deadlineAt));
      if (new Date(challenge.deadlineAt).getTime() <= Date.now()) returnToRinging();
    }, 500);
    const back = BackHandler.addEventListener('hardwareBackPress', () => { returnToRinging(); return true; });
    return () => { mounted = false; clearInterval(timer); back.remove(); };
  }, [challenge?.deadlineAt, preview, returnToRinging, route.params.challenge, sessionId]);

  if (!challenge) return <ScreenContainer><View style={styles.center}><Text style={styles.message}>Loading challenge...</Text></View></ScreenContainer>;
  return <ScreenContainer><View style={styles.content}><Text style={styles.type}>{challenge.type.replace('_', ' ')}</Text><Text style={styles.title}>{challenge.title}</Text><Text style={styles.countdown}>Time remaining: {remaining || formatRemaining(challenge.deadlineAt)}</Text><Text style={styles.instruction}>{challenge.instruction}</Text><Text style={styles.message}>Target: {challenge.targetKey.replaceAll('_', ' ')}</Text><Text style={styles.privacy}>Challenge photos are used only for wake verification.</Text><PrimaryButton title="Start Camera" onPress={() => navigation.navigate(preview ? 'PreviewCameraChallenge' : 'CameraChallenge', { alarmId, sessionId, preview, challenge })} style={styles.button} /><SecondaryButton title="Back to Alarm" onPress={returnToRinging} style={styles.back} /></View></ScreenContainer>;
}

const styles = StyleSheet.create({ center: { alignItems: 'center', flex: 1, justifyContent: 'center' }, content: { flex: 1, justifyContent: 'center' }, type: { ...typography.label, color: colors.primary, textAlign: 'center' }, title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' }, countdown: { ...typography.heading, color: colors.danger, marginTop: spacing.lg, textAlign: 'center' }, instruction: { ...typography.body, color: colors.textPrimary, marginTop: spacing.xl, textAlign: 'center' }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }, privacy: { ...typography.body, color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' }, button: { marginTop: spacing.xl }, back: { marginTop: spacing.md } });
