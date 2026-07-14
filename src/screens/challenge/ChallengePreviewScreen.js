import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Image, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import SecondaryButton from '../../components/common/SecondaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { compressChallengeImage } from '../../services/imageProcessingService';
import { useTheme } from '../../hooks/useTheme';
import { prepareChallengeAlerts, reconcileChallengeScreenSession, returnChallengeToRinging } from '../../services/challengeFlowService';

function getRemaining(deadlineAt) {
  return Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000));
}

export default function ChallengePreviewScreen({ navigation, route }) {
  const { alarmId, sessionId, challenge, image, preview = false, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount, lastVerificationCompletedAt, serviceRetryCount } = route.params;
  const [remaining, setRemaining] = useState(getRemaining(challenge.deadlineAt));
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const transitionStarted = useRef(false);
  const [challengeAllowed, setChallengeAllowed] = useState(true);

  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const timeout = useCallback(async () => {
    if (transitionStarted.current) return;
    transitionStarted.current = true;
    if (preview) navigation.popTo('AlarmPreview', { alarmId });
    else {
      await returnChallengeToRinging(sessionId, 'timeout').catch((error) => Alert.alert('Unable to restart alarm', error.message));
    }
  }, [alarmId, navigation, preview, sessionId]);

  useEffect(() => {
    let mounted = true;
    const prepare = async () => {
      await prepareChallengeAlerts(sessionId, preview).catch(() => {});
      if (preview) { if (mounted) setChallengeAllowed(true); return; }
      const result = await reconcileChallengeScreenSession(sessionId, route.name).catch(() => null);
      if (mounted && result?.action === 'stay-challenge') setChallengeAllowed(true);
    };
    prepare();
    const timer = setInterval(() => {
      const next = getRemaining(challenge.deadlineAt);
      setRemaining(next);
      if (next <= 0) timeout();
    }, 500);
    const back = BackHandler.addEventListener('hardwareBackPress', () => { navigation.navigate(preview ? 'PreviewCameraChallenge' : 'CameraChallenge', { alarmId, sessionId, preview, challenge, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount, lastVerificationCompletedAt, serviceRetryCount }); return true; });
    return () => { mounted = false; transitionStarted.current = true; submittingRef.current = true; clearInterval(timer); back.remove(); };
  }, [challenge, navigation, preview, route.name, sessionId, timeout]);

  const submit = async () => {
    if (submittingRef.current || remaining <= 0 || !challengeAllowed) return;
    if (!preview) {
      const result = await reconcileChallengeScreenSession(sessionId, route.name).catch(() => null);
      if (result?.action !== 'stay-challenge') return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const compressedImage = await compressChallengeImage(image);
      if (transitionStarted.current) return;
      if (!preview) {
        const result = await reconcileChallengeScreenSession(sessionId, route.name).catch(() => null);
        if (result?.action !== 'stay-challenge') return;
      }
      navigation.navigate(preview ? 'PreviewChallengeVerification' : 'ChallengeVerification', { alarmId, sessionId, preview, challenge, image: compressedImage, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount, lastVerificationCompletedAt, serviceRetryCount });
    } catch (error) {
      submittingRef.current = false;
      setSubmitting(false);
      Alert.alert('Unable to prepare photo', error.message);
    }
  };

  return <ScreenContainer><View style={styles.content}><Text style={styles.countdown}>Time remaining: {remaining}s</Text><Text style={styles.instruction}>{challenge.instruction}</Text><Image source={{ uri: image.uri }} style={styles.image} /><Text style={styles.privacy}>Challenge photos are used only for wake verification.</Text><PrimaryButton title={submitting ? 'Preparing...' : 'Submit for Verification'} onPress={submit} disabled={submitting || remaining <= 0} style={styles.button} /><SecondaryButton title="Retake" onPress={() => navigation.navigate(preview ? 'PreviewCameraChallenge' : 'CameraChallenge', { alarmId, sessionId, preview, challenge, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount, lastVerificationCompletedAt, serviceRetryCount })} disabled={submitting} style={styles.button} /></View></ScreenContainer>;
}

const createStyles = ({ colors, spacing, typography, radius }) => StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  countdown: { ...typography.heading, color: colors.danger, textAlign: 'center' },
  instruction: { ...typography.body, color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' },
  image: { backgroundColor: colors.border, borderRadius: radius.lg, height: 360, marginTop: spacing.lg, width: '100%' },
  privacy: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  button: { marginTop: spacing.md },
});
