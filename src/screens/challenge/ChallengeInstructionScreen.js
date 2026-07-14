import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import SecondaryButton from '../../components/common/SecondaryButton';
import { CHALLENGE_MODES } from '../../constants/alarmConstants';
import { MAX_CHALLENGE_REROLLS } from '../../constants/challengeConstants';
import { assignChallengeToSession, getActiveChallenges, rerollChallengeForSession } from '../../services/challengeService';
import { returnChallengeToRinging, stopChallengeAlerts } from '../../services/challengeFlowService';
import { useTheme } from '../../hooks/useTheme';

function formatRemaining(deadlineAt) {
  const seconds = Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function getRemainingSeconds(deadlineAt) {
  return Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000));
}

function pickRandom(challenges) {
  return challenges[Math.floor(Math.random() * challenges.length)];
}

export default function ChallengeInstructionScreen({ navigation, route }) {
  const { alarmId, sessionId, preview = false } = route.params;
  const [challenge, setChallenge] = useState(null);
  const [remaining, setRemaining] = useState('');
  const [rerolling, setRerolling] = useState(false);
  const [rerollMessage, setRerollMessage] = useState('');
  const [previewRerollCount, setPreviewRerollCount] = useState(route.params.previewRerollCount ?? 0);
  const [previewChallengeHistory, setPreviewChallengeHistory] = useState(route.params.previewChallengeHistory ?? []);
  const transitionStarted = useRef(false);
  const rerollRequestId = useRef(0);

  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

  const rerollChallenge = async () => {
    if (!challenge || rerolling || getRemainingSeconds(challenge.deadlineAt) <= 0) return;
    setRerolling(true);
    setRerollMessage('');
    const requestId = rerollRequestId.current + 1;
    rerollRequestId.current = requestId;
    try {
      if (preview) {
        if (previewRerollCount >= MAX_CHALLENGE_REROLLS) throw new Error('No rerolls remaining.');
        const validPool = getActiveChallenges().filter((item) => (route.params.challengeMode ?? CHALLENGE_MODES.RANDOM) === CHALLENGE_MODES.RANDOM || item.type === route.params.challengeMode);
        const alternatives = validPool.filter((item) => item.id !== challenge.id);
        if (alternatives.length === 0) throw new Error('No alternative challenge is available for this alarm.');
        const unseen = alternatives.filter((item) => !previewChallengeHistory.includes(item.id));
        const selected = pickRandom(unseen.length > 0 ? unseen : alternatives);
        const nextHistory = previewChallengeHistory.includes(challenge.id) ? previewChallengeHistory : [...previewChallengeHistory, challenge.id];
        if (requestId !== rerollRequestId.current || getRemainingSeconds(challenge.deadlineAt) <= 0) return;
        setPreviewChallengeHistory(nextHistory);
        setPreviewRerollCount((count) => count + 1);
        setChallenge({ ...selected, startedAt: challenge.startedAt, deadlineAt: challenge.deadlineAt, rerollCount: previewRerollCount + 1, remainingRerolls: Math.max(0, MAX_CHALLENGE_REROLLS - previewRerollCount - 1), challengeHistory: nextHistory });
      } else {
        const rerolled = await rerollChallengeForSession(sessionId);
        if (requestId !== rerollRequestId.current || getRemainingSeconds(rerolled.deadlineAt) <= 0) return;
        setChallenge(rerolled);
      }
    } catch (error) {
      setRerollMessage(error.message || 'Unable to choose another challenge.');
    } finally {
      if (requestId === rerollRequestId.current) setRerolling(false);
    }
  };

  if (!challenge) return <ScreenContainer><View style={styles.center}><Text style={styles.message}>Loading challenge...</Text></View></ScreenContainer>;
  const remainingRerolls = preview ? Math.max(0, MAX_CHALLENGE_REROLLS - previewRerollCount) : challenge.remainingRerolls ?? 0;
  const rerollText = remainingRerolls === 0 ? 'No rerolls remaining' : `${remainingRerolls} reroll${remainingRerolls === 1 ? '' : 's'} remaining`;
  return <ScreenContainer><View style={styles.content}><Text style={styles.type}>{challenge.type.replace('_', ' ')}</Text><Text style={styles.title}>{challenge.title}</Text><Text style={styles.countdown}>Time remaining: {remaining || formatRemaining(challenge.deadlineAt)}</Text><Text style={styles.instruction}>{challenge.instruction}</Text><Text style={styles.message}>Target: {challenge.targetKey.replaceAll('_', ' ')}</Text><Text style={styles.message}>{rerollText}</Text>{rerollMessage ? <Text style={styles.warning}>{rerollMessage}</Text> : null}<Text style={styles.privacy}>Challenge photos are used only for wake verification.</Text><PrimaryButton title="Start Camera" onPress={() => navigation.navigate(preview ? 'PreviewCameraChallenge' : 'CameraChallenge', { alarmId, sessionId, preview, challenge, challengeMode: route.params.challengeMode, previewRerollCount, previewChallengeHistory })} style={styles.button} /><SecondaryButton title={rerolling ? 'Choosing...' : 'Random Another Challenge'} onPress={rerollChallenge} disabled={rerolling || remainingRerolls <= 0} style={styles.back} /><SecondaryButton title="Back to Alarm" onPress={returnToRinging} style={styles.back} /></View></ScreenContainer>;
}

const createStyles = ({ colors, spacing, typography, radius }) => StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center' },
  type: { ...typography.label, color: colors.primary, textAlign: 'center' },
  title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' },
  countdown: { ...typography.heading, color: colors.danger, marginTop: spacing.lg, textAlign: 'center' },
  instruction: { ...typography.body, color: colors.textPrimary, marginTop: spacing.xl, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  privacy: { ...typography.body, color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' },
  warning: { ...typography.body, color: colors.danger, marginTop: spacing.sm, textAlign: 'center' },
  button: { marginTop: spacing.xl },
  back: { marginTop: spacing.md },
});
