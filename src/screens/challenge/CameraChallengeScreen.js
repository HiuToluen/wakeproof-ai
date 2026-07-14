import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import PrimaryButton from '../../components/common/PrimaryButton';
import SecondaryButton from '../../components/common/SecondaryButton';
import { prepareChallengeAlerts, reconcileChallengeScreenSession, returnChallengeToRinging } from '../../services/challengeFlowService';
import { colors, spacing, typography } from '../../theme';

function getRemaining(deadlineAt) {
  return Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000));
}

export default function CameraChallengeScreen({ navigation, route }) {
  const { alarmId, sessionId, challenge, preview = false, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount, lastVerificationCompletedAt, serviceRetryCount } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [remaining, setRemaining] = useState(getRemaining(challenge.deadlineAt));
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);
  const transitionStarted = useRef(false);
  const operationId = useRef(0);
  const [challengeAllowed, setChallengeAllowed] = useState(true);

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
    requestPermission();
    const timer = setInterval(() => {
      const next = getRemaining(challenge.deadlineAt);
      setRemaining(next);
      if (next <= 0) timeout();
    }, 500);
    const back = BackHandler.addEventListener('hardwareBackPress', () => { navigation.navigate(preview ? 'PreviewChallengeInstruction' : 'ChallengeInstruction', { alarmId, sessionId, preview, challenge, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount, lastVerificationCompletedAt, serviceRetryCount }); return true; });
    return () => { mounted = false; transitionStarted.current = true; operationId.current += 1; clearInterval(timer); back.remove(); };
  }, [challenge, challenge.deadlineAt, navigation, preview, requestPermission, route.name, sessionId, timeout]);

  const capture = async () => {
    if (capturing || !cameraReady || !cameraRef.current || remaining <= 0 || !challengeAllowed) return;
    if (!preview) {
      const result = await reconcileChallengeScreenSession(sessionId, route.name).catch(() => null);
      if (result?.action !== 'stay-challenge') return;
    }
    const currentOperation = operationId.current + 1;
    operationId.current = currentOperation;
    setCapturing(true);
    try {
      const image = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false, exif: false });
      if (currentOperation !== operationId.current || transitionStarted.current) return;
      if (!preview) {
        const result = await reconcileChallengeScreenSession(sessionId, route.name).catch(() => null);
        if (result?.action !== 'stay-challenge' || currentOperation !== operationId.current) return;
      }
      navigation.navigate(preview ? 'PreviewChallengePhoto' : 'ChallengePreview', { alarmId, sessionId, preview, challenge, image, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount, lastVerificationCompletedAt, serviceRetryCount });
    } catch (error) {
      Alert.alert('Unable to capture photo', error.message);
      setCapturing(false);
    }
  };

  if (!permission) return <View style={styles.center}><Text style={styles.message}>Checking camera permission...</Text></View>;
  if (!permission.granted) return <View style={styles.permission}><Text style={styles.title}>Camera access is needed</Text><Text style={styles.message}>Use the camera to take a direct proof photo. Time remaining: {remaining}s</Text><PrimaryButton title="Retry Permission" onPress={requestPermission} style={styles.button} />{!permission.canAskAgain ? <SecondaryButton title="Open Settings" onPress={() => Linking.openSettings?.()} style={styles.button} /> : null}<SecondaryButton title="Back" onPress={() => navigation.navigate(preview ? 'PreviewChallengeInstruction' : 'ChallengeInstruction', { alarmId, sessionId, preview, challenge, challengeMode, previewRerollCount, previewChallengeHistory, previewAttemptCount, lastVerificationCompletedAt, serviceRetryCount })} style={styles.button} /></View>;

  return <View style={styles.container}><CameraView ref={cameraRef} style={styles.camera} facing={facing} mode="picture" onCameraReady={() => setCameraReady(true)} /><View pointerEvents="none" style={styles.overlay}><Text style={styles.countdown}>{remaining}s</Text><Text style={styles.instruction}>{challenge.instruction}</Text></View><View style={styles.controls}><Pressable style={styles.flip} onPress={() => setFacing((current) => current === 'back' ? 'front' : 'back')} disabled={capturing}><Text style={styles.controlText}>Flip</Text></Pressable><Pressable style={[styles.capture, capturing && styles.disabled]} onPress={capture} disabled={capturing || !cameraReady || remaining <= 0}><Text style={styles.controlText}>{capturing ? 'Saving...' : 'Capture'}</Text></Pressable></View></View>;
}

const styles = StyleSheet.create({ container: { backgroundColor: colors.textPrimary, flex: 1 }, camera: { flex: 1 }, center: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.lg }, permission: { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.lg }, title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }, button: { marginTop: spacing.md }, overlay: { backgroundColor: 'rgba(0,0,0,0.45)', left: 0, padding: spacing.lg, paddingTop: spacing.xxl, position: 'absolute', right: 0, top: 0 }, countdown: { ...typography.heading, color: colors.white, textAlign: 'center' }, instruction: { ...typography.body, color: colors.white, marginTop: spacing.sm, textAlign: 'center' }, controls: { alignItems: 'center', bottom: spacing.xl, flexDirection: 'row', gap: spacing.lg, justifyContent: 'center', left: 0, position: 'absolute', right: 0 }, flip: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: spacing.md }, capture: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.lg }, disabled: { opacity: 0.5 }, controlText: { ...typography.label, color: colors.white } });
