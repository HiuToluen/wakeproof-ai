import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, Vibration, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import SecondaryButton from '../../components/common/SecondaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { CHALLENGE_ATTEMPT_STATUS, CHALLENGE_FLOW_MODES, CHALLENGE_TIMEOUT_SECONDS, MAX_CHALLENGE_ATTEMPTS, MAX_NETWORK_RETRIES, MIN_VERIFICATION_INTERVAL_MS, OFFLINE_HOLD_DURATION_SECONDS, OFFLINE_MATH_QUESTION_COUNT } from '../../constants/challengeConstants';
import { disableAlarmAndClearSchedule, getAlarmById } from '../../database/alarmRepository';
import { createChallengeAttempt, updateChallengeAttemptResult } from '../../database/challengeAttemptRepository';
import { completeSessionAndActivateNext, getAlarmSessionById, incrementChallengeNetworkRetryCount, markOfflineFallbackUsed, registerChallengeAttemptLockout } from '../../database/alarmSessionRepository';
import { stopChallengeAlerts, returnChallengeToRinging } from '../../services/challengeFlowService';
import { getAssignedChallenge } from '../../services/challengeService';
import { verifyChallenge } from '../../services/challengeVerificationService';
import { colors, spacing, typography } from '../../theme';

const TECHNICAL_ERROR_CODES = ['NETWORK_ERROR', 'VERIFICATION_TIMEOUT', 'AI_SERVICE_ERROR', 'RATE_LIMITED', 'INVALID_AI_RESPONSE', 'MISSING_API_KEY'];

function getRemaining(deadlineAt) {
  return Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000));
}

function isRetryableSameImageError(error) {
  return TECHNICAL_ERROR_CODES.includes(error?.code);
}

function isOfflineEligibleError(error) {
  return TECHNICAL_ERROR_CODES.includes(error?.code);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function createMathQuestions() {
  return Array.from({ length: OFFLINE_MATH_QUESTION_COUNT }, () => {
    const operation = ['+', '-', '×'][Math.floor(Math.random() * 3)];
    if (operation === '+') {
      const a = randomInt(12, 49);
      const b = randomInt(13, 48);
      return { text: `${a} + ${b}`, answer: a + b };
    }
    if (operation === '-') {
      const a = randomInt(50, 99);
      const b = randomInt(11, a - 5);
      return { text: `${a} - ${b}`, answer: a - b };
    }
    const a = randomInt(6, 12);
    const b = randomInt(6, 12);
    return { text: `${a} × ${b}`, answer: a * b };
  });
}

export default function ChallengeVerificationScreen({ navigation, route }) {
  const { alarmId, sessionId, challenge, image, preview = false, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount = 0, sameImageRetries = 0, serviceRetryCount = 0, lastVerificationCompletedAt = 0 } = route.params;
  const [remaining, setRemaining] = useState(getRemaining(challenge.deadlineAt));
  const [state, setState] = useState('LOADING');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptCount, setAttemptCount] = useState(preview ? previewAttemptCount : 0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [retakeRequired, setRetakeRequired] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [offlineStep, setOfflineStep] = useState('HOLD');
  const [holdProgress, setHoldProgress] = useState(0);
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathIndex, setMathIndex] = useState(0);
  const [mathMessage, setMathMessage] = useState('');
  const [mathQuestions, setMathQuestions] = useState(createMathQuestions);
  const stateRef = useRef('LOADING');
  const requestId = useRef(0);
  const timedOut = useRef(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const started = useRef(false);
  const offlineEntered = useRef(false);
  const holdTimer = useRef(null);
  const sameImageRetryCount = useRef(sameImageRetries);
  const serviceRetryCountRef = useRef(serviceRetryCount);
  const lastCompletedAt = useRef(lastVerificationCompletedAt);

  const timeout = useCallback(async (message) => {
    if (timedOut.current) return;
    timedOut.current = true;
    requestId.current += 1;
    if (holdTimer.current) clearInterval(holdTimer.current);
    if (preview) navigation.popTo('AlarmPreview', { alarmId });
    else {
      await returnChallengeToRinging(sessionId, { restartAlerts: false }).catch((error) => Alert.alert('Unable to restart alarm', error.message));
      if (message) Alert.alert('Challenge stopped', message);
      navigation.reset({ index: 0, routes: [{ name: 'AlarmRinging', params: { alarmId, sessionId } }] });
    }
  }, [alarmId, navigation, preview, sessionId]);

  const completeChallenge = useCallback(async (verification, currentRequest) => {
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
    if (!preview && !nextSession) Alert.alert('Challenge passed', 'Have a great day!');
    setResult({ ...verification, nextSession });
    stateRef.current = 'PASSED';
    setState('PASSED');
  }, [preview, sessionId]);

  const getCooldownMs = useCallback(() => Math.max(0, MIN_VERIFICATION_INTERVAL_MS - (Date.now() - lastCompletedAt.current)), []);

  const navigateToRetake = useCallback(() => {
    if (offlineEntered.current) return;
    navigation.navigate(preview ? 'PreviewCameraChallenge' : 'CameraChallenge', { alarmId, sessionId, preview, challenge, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount: attemptCount, lastVerificationCompletedAt: lastCompletedAt.current, serviceRetryCount: serviceRetryCountRef.current });
  }, [alarmId, attemptCount, challenge, challengeMode, navigation, preview, previewChallengeHistory, previewRerollCount, sessionId]);

  const restartPreviewChallenge = useCallback(() => {
    const startedAt = new Date().toISOString();
    const deadlineAt = new Date(Date.now() + CHALLENGE_TIMEOUT_SECONDS * 1000).toISOString();
    navigation.navigate('PreviewChallengeInstruction', { alarmId, sessionId, preview: true, challenge: { ...challenge, startedAt, deadlineAt }, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount: 0, serviceRetryCount: 0, lastVerificationCompletedAt: 0 });
  }, [alarmId, challenge, challengeMode, navigation, previewChallengeHistory, previewRerollCount, sessionId]);

  const enterOfflineEmergency = useCallback(async () => {
    if (offlineEntered.current || timedOut.current) return;
    if (getRemaining(challenge.deadlineAt) <= 0) { timeout(); return; }
    offlineEntered.current = true;
    requestId.current += 1;
    inFlight.current = false;
    if (!preview) await markOfflineFallbackUsed(sessionId).catch(() => {});
    setErrorMessage('Offline emergency challenge started. Complete both steps before time runs out.');
    setRetakeRequired(true);
    setOfflineStep('HOLD');
    setHoldProgress(0);
    stateRef.current = 'OFFLINE';
    setState('OFFLINE');
  }, [challenge.deadlineAt, preview, sessionId, timeout]);

  const runVerification = useCallback(async (options = {}) => {
    if (offlineEntered.current || inFlight.current || timedOut.current) return;
    if (getRemaining(challenge.deadlineAt) <= 0) { timeout(); return; }
    if (retakeRequired && options.sameImageRetry) return;
    const cooldownMs = lastCompletedAt.current ? getCooldownMs() : 0;
    if (cooldownMs > 0) { setCooldownRemaining(Math.ceil(cooldownMs / 1000)); return; }
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    inFlight.current = true;
    stateRef.current = 'LOADING';
    setState('LOADING');
    setErrorMessage('');
    setResult(null);
    setLimitReached(false);
    let nextAttemptCount = attemptCount;
    let attempt;
    try {
      const currentChallenge = preview ? challenge : await getAssignedChallenge(sessionId) ?? challenge;
      if (getRemaining(currentChallenge.deadlineAt) <= 0) { timeout(); return; }
      const session = preview ? null : await getAlarmSessionById(sessionId);
      const persistedAttemptCount = preview ? attemptCount : session?.challengeAttemptCount ?? 0;
      serviceRetryCountRef.current = preview ? serviceRetryCountRef.current : session?.challengeNetworkRetryCount ?? 0;
      setAttemptCount(persistedAttemptCount);
      if (persistedAttemptCount >= MAX_CHALLENGE_ATTEMPTS) { setLimitReached(true); if (!preview) await registerChallengeAttemptLockout(sessionId); await timeout('Too many failed attempts. The alarm is ringing again. Challenge retry is temporarily locked.'); return; }
      attempt = preview ? null : await createChallengeAttempt({ sessionId, challengeId: currentChallenge.id, imageUri: image.uri });
      const verification = await verifyChallenge({ sessionId, challenge: currentChallenge, image });
      lastCompletedAt.current = Date.now();
      if (!mounted.current || timedOut.current || requestId.current !== currentRequest) return;
      const latestSession = preview ? null : await getAlarmSessionById(sessionId);
      const deadlineAt = preview ? currentChallenge.deadlineAt : latestSession?.challengeDeadlineAt;
      const locked = latestSession?.challengeLockedUntil && new Date(latestSession.challengeLockedUntil).getTime() > Date.now();
      if (!preview && (!latestSession || latestSession.status !== 'CHALLENGE_ACTIVE' || latestSession.challengeFlowMode !== CHALLENGE_FLOW_MODES.AI || latestSession.challengeId !== currentChallenge.id || locked || !deadlineAt || new Date(deadlineAt).getTime() <= Date.now())) return;
      if (getRemaining(currentChallenge.deadlineAt) <= 0) { timeout(); return; }
      if (preview) {
        nextAttemptCount = verification.isValid ? persistedAttemptCount : persistedAttemptCount + 1;
        setAttemptCount(nextAttemptCount);
      } else {
        await updateChallengeAttemptResult(attempt.id, { verificationStatus: verification.isValid ? CHALLENGE_ATTEMPT_STATUS.PASSED : CHALLENGE_ATTEMPT_STATUS.FAILED, ...verification });
        const countedSession = await getAlarmSessionById(sessionId);
        nextAttemptCount = countedSession?.challengeAttemptCount ?? persistedAttemptCount;
        setAttemptCount(nextAttemptCount);
      }
      if (verification.isValid) {
        await completeChallenge(verification, currentRequest);
      } else {
        if (!mounted.current || timedOut.current || requestId.current !== currentRequest) return;
        setResult(verification);
        setRetakeRequired(true);
        if (nextAttemptCount >= MAX_CHALLENGE_ATTEMPTS && !preview) { setLimitReached(true); await registerChallengeAttemptLockout(sessionId); await timeout('Too many failed attempts. The alarm is ringing again. Challenge retry is temporarily locked.'); return; }
        if (nextAttemptCount >= MAX_CHALLENGE_ATTEMPTS) { setLimitReached(true); setErrorMessage('Verification limit reached in preview.'); stateRef.current = 'ERROR'; setState('ERROR'); return; }
        stateRef.current = 'FAILED';
        setState('FAILED');
      }
    } catch (error) {
      lastCompletedAt.current = Date.now();
      if (attempt) await updateChallengeAttemptResult(attempt.id, { verificationStatus: CHALLENGE_ATTEMPT_STATUS.ERROR, isValid: false, reason: error.message }).catch(() => {});
      if (!mounted.current || timedOut.current || requestId.current !== currentRequest) return;
      if (isOfflineEligibleError(error)) {
        if (preview) serviceRetryCountRef.current += 1;
        else {
          const updatedSession = await incrementChallengeNetworkRetryCount(sessionId);
          serviceRetryCountRef.current = updatedSession?.challengeNetworkRetryCount ?? serviceRetryCountRef.current + 1;
        }
      }
      const canRetrySameImage = isRetryableSameImageError(error) && serviceRetryCountRef.current <= MAX_NETWORK_RETRIES;
      const canUseOffline = isOfflineEligibleError(error) && serviceRetryCountRef.current > MAX_NETWORK_RETRIES;
      if (canUseOffline) {
        offlineEntered.current = true;
        requestId.current += 1;
        if (!preview) await markOfflineFallbackUsed(sessionId).catch(() => {});
        setRetakeRequired(true);
        setErrorMessage('AI verification is still unavailable. Complete the offline emergency challenge to stop the alarm.');
        setOfflineStep('HOLD');
        setHoldProgress(0);
        stateRef.current = 'OFFLINE';
        setState('OFFLINE');
        return;
      }
      setRetakeRequired(!canRetrySameImage);
      setErrorMessage(canRetrySameImage ? 'AI verification is temporarily unavailable. You can retry once.' : `${error.message} Please retake the photo before verifying again.`);
      stateRef.current = 'ERROR';
      setState('ERROR');
    } finally {
      if (requestId.current === currentRequest) inFlight.current = false;
    }
  }, [attemptCount, challenge, completeChallenge, getCooldownMs, image, preview, retakeRequired, sessionId, timeout]);

  const startHold = useCallback(() => {
    if (state !== 'OFFLINE' || offlineStep !== 'HOLD' || holdTimer.current || timedOut.current) return;
    holdTimer.current = setInterval(() => {
      setHoldProgress((value) => {
        const next = Math.min(OFFLINE_HOLD_DURATION_SECONDS, value + 1);
        if (next >= OFFLINE_HOLD_DURATION_SECONDS) {
          clearInterval(holdTimer.current);
          holdTimer.current = null;
          setOfflineStep('MATH');
        }
        return next;
      });
    }, 1000);
  }, [offlineStep, state]);

  const resetHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    if (offlineStep === 'HOLD') setHoldProgress(0);
  }, [offlineStep]);

  const submitMath = useCallback(async () => {
    if (timedOut.current || offlineStep !== 'MATH') return;
    if (mathAnswer.trim() === '') { setMathMessage('Enter an answer.'); return; }
    const correct = Number(mathAnswer) === mathQuestions[mathIndex].answer;
    if (!correct) {
      setMathAnswer('');
      setMathMessage('Incorrect. Try this question again.');
      return;
    }
    if (mathIndex < mathQuestions.length - 1) {
      setMathIndex((index) => index + 1);
      setMathAnswer('');
      setMathMessage('Correct. Next question.');
      return;
    }
    const currentRequest = requestId.current;
    await completeChallenge({ isValid: true, confidence: 0, reason: 'Offline emergency challenge completed.', detectedObjects: [] }, currentRequest);
  }, [completeChallenge, mathAnswer, mathIndex, mathQuestions, offlineStep]);

  useEffect(() => {
    mounted.current = true;
    stopChallengeAlerts().catch(() => {});
    if (!started.current) {
      started.current = true;
      runVerification();
    }
    const timer = setInterval(() => {
      const next = getRemaining(challenge.deadlineAt);
      setRemaining(next);
      setCooldownRemaining(Math.ceil(getCooldownMs() / 1000));
      if (next <= 0) timeout();
    }, 500);
    const back = BackHandler.addEventListener('hardwareBackPress', () => stateRef.current === 'LOADING' || offlineEntered.current ? true : (navigateToRetake(), true));
    return () => { mounted.current = false; clearInterval(timer); if (holdTimer.current) clearInterval(holdTimer.current); back.remove(); requestId.current += 1; inFlight.current = false; };
  }, []);

  const attemptText = `Attempt ${Math.min(attemptCount, MAX_CHALLENGE_ATTEMPTS)} of ${MAX_CHALLENGE_ATTEMPTS}`;
  const canRetrySameImage = state === 'ERROR' && !retakeRequired && !limitReached && cooldownRemaining <= 0 && !inFlight.current && serviceRetryCountRef.current <= MAX_NETWORK_RETRIES;
  const canUseOffline = state === 'ERROR' && serviceRetryCountRef.current > MAX_NETWORK_RETRIES && !offlineEntered.current;

  return <ScreenContainer><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}><TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}><View style={styles.content}>{!(preview && state === 'PASSED') ? <><Text style={styles.countdown}>Time remaining: {remaining}s</Text><Text style={styles.message}>{attemptText}</Text></> : null}{cooldownRemaining > 0 && state !== 'OFFLINE' ? <Text style={styles.warning}>Please wait {cooldownRemaining}s before verifying again.</Text> : null}{limitReached ? <Text style={styles.warning}>Too many failed attempts. The alarm is ringing again.</Text> : null}{state === 'LOADING' ? <Text style={styles.title}>Checking your proof...</Text> : null}{state === 'PASSED' ? <><Text style={styles.success}>Challenge passed</Text><Text style={styles.message}>{preview ? 'Preview challenge completed.' : result?.nextSession ? 'The next queued alarm is starting.' : 'Have a great day!'}</Text>{preview ? <><PrimaryButton title="Back to Alarm Preview" onPress={() => navigation.popTo('AlarmPreview', { alarmId })} style={styles.button} /><SecondaryButton title="Try Again" onPress={navigateToRetake} style={styles.button} /></> : null}</> : null}{state === 'FAILED' ? <><Text style={styles.title}>Retake required</Text><Text style={styles.message}>{result?.reason}</Text><Text style={styles.message}>Confidence: {Math.round((result?.confidence ?? 0) * 100)}%</Text><Text style={styles.warning}>Please retake the photo before verifying again.</Text><SecondaryButton title="Retake" onPress={navigateToRetake} style={styles.button} /></> : null}{state === 'ERROR' ? <><Text style={styles.title}>Verification had a problem</Text><Text style={styles.message}>{errorMessage || 'Please try again.'}</Text>{preview && limitReached ? <><PrimaryButton title="Restart Preview Challenge" onPress={restartPreviewChallenge} style={styles.button} /><SecondaryButton title="Back to Alarm Preview" onPress={() => navigation.popTo('AlarmPreview', { alarmId })} style={styles.button} /></> : <>{canRetrySameImage ? <PrimaryButton title="Retry Verification" onPress={() => runVerification({ sameImageRetry: true })} style={styles.button} /> : null}{canUseOffline ? <PrimaryButton title="Use Offline Emergency Challenge" onPress={enterOfflineEmergency} style={styles.button} /> : null}{!canUseOffline ? <SecondaryButton title="Retake" onPress={navigateToRetake} style={styles.button} /> : null}</>}</> : null}{state === 'OFFLINE' ? <><Text style={styles.title}>Offline Emergency Challenge</Text><Text style={styles.warning}>This does not count as AI verification.</Text>{offlineStep === 'HOLD' ? <><Text style={styles.message}>Step 1 of 2: Hold continuously for {OFFLINE_HOLD_DURATION_SECONDS} seconds.</Text><Text style={styles.title}>{holdProgress}s / {OFFLINE_HOLD_DURATION_SECONDS}s</Text><Pressable onPressIn={startHold} onPressOut={resetHold} style={styles.holdButton}><Text style={styles.holdText}>Hold</Text></Pressable><Text style={styles.message}>Releasing early resets progress.</Text></> : <><Text style={styles.message}>Step 2 of 2: Solve all {OFFLINE_MATH_QUESTION_COUNT} questions to complete the emergency challenge.</Text><Text style={styles.message}>Question {mathIndex + 1} of {OFFLINE_MATH_QUESTION_COUNT}</Text><View style={styles.mathRow}><Text style={styles.mathQuestion}>{mathQuestions[mathIndex].text} =</Text><TextInput value={mathAnswer} onChangeText={(value) => setMathAnswer(value.replace(/[^0-9-]/g, ''))} keyboardType="number-pad" style={styles.input} /></View>{mathMessage ? <Text style={styles.warning}>{mathMessage}</Text> : null}<PrimaryButton title="Submit Answer" onPress={submitMath} style={styles.button} /></>}</> : null}</View></TouchableWithoutFeedback></KeyboardAvoidingView></ScreenContainer>;
}

const styles = StyleSheet.create({ keyboard: { flex: 1 }, content: { flex: 1, justifyContent: 'center' }, countdown: { ...typography.heading, color: colors.danger, textAlign: 'center' }, title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.xl, textAlign: 'center' }, success: { ...typography.heading, color: colors.primary, marginTop: spacing.xl, textAlign: 'center' }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }, warning: { ...typography.body, color: colors.danger, marginTop: spacing.md, textAlign: 'center' }, button: { marginTop: spacing.md }, holdButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 999, height: 140, justifyContent: 'center', marginTop: spacing.lg, alignSelf: 'center', width: 140 }, holdText: { ...typography.heading, color: colors.white }, mathRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md }, mathQuestion: { color: colors.textPrimary, fontSize: 28, fontWeight: '700', minWidth: 130 }, input: { borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.textPrimary, fontSize: 28, fontWeight: '700', minWidth: 120, padding: spacing.md, textAlign: 'center' } });
