import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, Text, Vibration, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import SecondaryButton from '../../components/common/SecondaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { CHALLENGE_ATTEMPT_STATUS } from '../../constants/challengeConstants';
import { disableAlarmAndClearSchedule, getAlarmById } from '../../database/alarmRepository';
import { createChallengeAttempt, updateChallengeAttemptResult } from '../../database/challengeAttemptRepository';
import { completeSessionAndActivateNext, getAlarmSessionById } from '../../database/alarmSessionRepository';
import { stopChallengeAlerts, returnChallengeToRinging } from '../../services/challengeFlowService';
import { verifyChallenge } from '../../services/mockChallengeVerificationService';
import { colors, spacing, typography } from '../../theme';

function getRemaining(deadlineAt) {
  return Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000));
}

export default function ChallengeVerificationScreen({ navigation, route }) {
  const { alarmId, sessionId, challenge, image, preview = false } = route.params;
  const [remaining, setRemaining] = useState(getRemaining(challenge.deadlineAt));
  const [state, setState] = useState('LOADING');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const stateRef = useRef('LOADING');
  const requestId = useRef(0);
  const timedOut = useRef(false);
  const mounted = useRef(true);

  const timeout = useCallback(async () => {
    if (timedOut.current) return;
    timedOut.current = true;
    requestId.current += 1;
    if (preview) navigation.popTo('AlarmPreview', { alarmId });
    else await returnChallengeToRinging(sessionId).catch((error) => Alert.alert('Unable to restart alarm', error.message));
  }, [alarmId, navigation, preview, sessionId]);

  const runVerification = useCallback(async () => {
    if (getRemaining(challenge.deadlineAt) <= 0) { timeout(); return; }
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    stateRef.current = 'LOADING';
    setState('LOADING');
    setErrorMessage('');
    setResult(null);
    let attempt;
    try {
      if (!preview) attempt = await createChallengeAttempt({ sessionId, challengeId: challenge.id, imageUri: image.uri });
      const verification = await verifyChallenge({ sessionId, challenge, image });
      if (!mounted.current || timedOut.current || requestId.current !== currentRequest) return;
      if (getRemaining(challenge.deadlineAt) <= 0) { timeout(); return; }
      if (verification.isValid) {
        if (attempt) await updateChallengeAttemptResult(attempt.id, { verificationStatus: CHALLENGE_ATTEMPT_STATUS.PASSED, ...verification });
        await stopChallengeAlerts();
        Vibration.cancel();
        let nextSession = null;
        if (!preview) {
          const session = await getAlarmSessionById(sessionId);
          const alarm = session ? await getAlarmById(session.alarmId) : null;
          nextSession = await completeSessionAndActivateNext(sessionId);
          if (alarm?.repeatDays.length === 0) await disableAlarmAndClearSchedule(alarm.id);
        }
        if (!mounted.current || timedOut.current || requestId.current !== currentRequest) return;
        setResult({ ...verification, nextSession });
        stateRef.current = 'PASSED';
        setState('PASSED');
      } else {
        if (attempt) await updateChallengeAttemptResult(attempt.id, { verificationStatus: CHALLENGE_ATTEMPT_STATUS.FAILED, ...verification });
        if (!mounted.current || timedOut.current || requestId.current !== currentRequest) return;
        setResult(verification);
        stateRef.current = 'FAILED';
        setState('FAILED');
      }
    } catch (error) {
      if (attempt) await updateChallengeAttemptResult(attempt.id, { verificationStatus: CHALLENGE_ATTEMPT_STATUS.ERROR, isValid: false, reason: error.message }).catch(() => {});
      if (!mounted.current || timedOut.current || requestId.current !== currentRequest) return;
      setErrorMessage(error.message);
      stateRef.current = 'ERROR';
      setState('ERROR');
    }
  }, [challenge, image, preview, sessionId, timeout]);

  useEffect(() => {
    mounted.current = true;
    stopChallengeAlerts().catch(() => {});
    runVerification();
    const timer = setInterval(() => {
      const next = getRemaining(challenge.deadlineAt);
      setRemaining(next);
      if (next <= 0) timeout();
    }, 500);
    const back = BackHandler.addEventListener('hardwareBackPress', () => stateRef.current === 'LOADING' ? true : (navigation.navigate(preview ? 'PreviewCameraChallenge' : 'CameraChallenge', { alarmId, sessionId, preview, challenge }), true));
    return () => { mounted.current = false; clearInterval(timer); back.remove(); requestId.current += 1; };
  }, [challenge, navigation, preview, runVerification, sessionId, timeout]);

  return <ScreenContainer><View style={styles.content}><Text style={styles.countdown}>Time remaining: {remaining}s</Text>{state === 'LOADING' ? <Text style={styles.title}>Checking your proof...</Text> : null}{state === 'PASSED' ? <><Text style={styles.success}>Challenge passed</Text><Text style={styles.message}>{preview ? 'Preview challenge completed.' : result?.nextSession ? 'The next queued alarm is starting.' : 'Alarm completed.'}</Text>{preview ? <><PrimaryButton title="Back to Alarm Preview" onPress={() => navigation.popTo('AlarmPreview', { alarmId })} style={styles.button} /><SecondaryButton title="Try Again" onPress={() => navigation.navigate('PreviewCameraChallenge', { alarmId, sessionId, preview, challenge })} style={styles.button} /></> : null}</> : null}{state === 'FAILED' ? <><Text style={styles.title}>Try again</Text><Text style={styles.message}>{result?.reason}</Text><Text style={styles.message}>Confidence: {Math.round((result?.confidence ?? 0) * 100)}%</Text><SecondaryButton title="Retake" onPress={() => navigation.navigate(preview ? 'PreviewCameraChallenge' : 'CameraChallenge', { alarmId, sessionId, preview, challenge })} style={styles.button} /></> : null}{state === 'ERROR' ? <><Text style={styles.title}>Verification had a problem</Text><Text style={styles.message}>{errorMessage || 'Please try again.'}</Text><PrimaryButton title="Retry Verification" onPress={runVerification} style={styles.button} /><SecondaryButton title="Retake" onPress={() => navigation.navigate(preview ? 'PreviewCameraChallenge' : 'CameraChallenge', { alarmId, sessionId, preview, challenge })} style={styles.button} /></> : null}</View></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: 'center' }, countdown: { ...typography.heading, color: colors.danger, textAlign: 'center' }, title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.xl, textAlign: 'center' }, success: { ...typography.heading, color: colors.primary, marginTop: spacing.xl, textAlign: 'center' }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }, button: { marginTop: spacing.md } });
