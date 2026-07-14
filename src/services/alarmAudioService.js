import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { DEFAULT_RINGTONE_ID, getRingtoneById } from '../constants/alarmConstants';
import { assertNoActiveAlarmSession } from './alarmMutationGuard';
import { releaseAlarmStreamVolumeSnapshot, restoreAlarmStreamVolume } from './androidAlarmVolumeService';
import { resolveRingtoneSource } from './customRingtoneService';

export const MAX_ALARM_VOLUME = 1;

let expoPlayer;
let expoPlayerMode;
let activeSessionId;
let activeRingtoneId;
let nativeModule;

function getNativeModule() {
  if (Platform.OS !== 'android') return null;
  if (!nativeModule) nativeModule = require('../../modules/wake-proof-alarm-audio').default;
  return nativeModule;
}

function logAudio(mode, details = {}) {
  if (__DEV__) console.log('[alarm-audio]', { mode, ...details });
}

function setExpoPlayerVolume() {
  if (expoPlayer) expoPlayer.volume = MAX_ALARM_VOLUME;
}

function createExpoPlayerWithFallback(ringtone) {
  try {
    return { nextPlayer: createAudioPlayer(ringtone.source, { downloadFirst: true }), resolvedRingtone: ringtone };
  } catch {
    const fallback = getRingtoneById(DEFAULT_RINGTONE_ID);
    return { nextPlayer: createAudioPlayer(fallback.source, { downloadFirst: true }), resolvedRingtone: fallback };
  }
}

function requireReadableLocalFile(uri, message) {
  if (typeof uri !== 'string' || !uri.startsWith('file://')) throw new Error(message);
  const file = new File(uri);
  if (!file.exists || file.size <= 0) throw new Error(message);
  return file.uri;
}

async function resolveNativeRingtone(ringtone) {
  if (ringtone.custom && ringtone.source?.uri) return { uri: requireReadableLocalFile(ringtone.source.uri, 'Custom ringtone file is unavailable.'), sourceType: 'custom' };
  const asset = Asset.fromModule(ringtone.source);
  await asset.downloadAsync();
  return { uri: requireReadableLocalFile(asset.localUri, 'Built-in ringtone asset could not be resolved locally.'), sourceType: 'builtIn' };
}

async function startExpoFallback(sessionId, ringtone) {
  await stopExpoPlayer();
  await setAudioModeAsync({ interruptionMode: 'doNotMix', playsInSilentMode: true, shouldPlayInBackground: false });
  const resolved = createExpoPlayerWithFallback(ringtone);
  expoPlayer = resolved.nextPlayer;
  expoPlayerMode = 'real-fallback';
  activeSessionId = sessionId;
  activeRingtoneId = resolved.resolvedRingtone.id;
  expoPlayer.loop = true;
  setExpoPlayerVolume();
  expoPlayer.play();
  logAudio('fallback-expo', { sourceType: ringtone.custom ? 'custom' : 'builtIn' });
  return { started: true, ringtoneId: activeRingtoneId, fallback: true };
}

async function stopExpoPlayer() {
  if (expoPlayer) {
    try { expoPlayer.pause(); } catch {}
    expoPlayer.remove();
    expoPlayer = undefined;
  }
  expoPlayerMode = undefined;
}

export function resetAlarmVolume() {
  setExpoPlayerVolume();
}

export function stopVolumeRamp() {}

export function startVolumeRamp() {}

export async function startAlarmPlayback(sessionId, ringtoneId) {
  const ringtone = await resolveRingtoneSource(ringtoneId);
  if (Platform.OS === 'android') {
    const module = getNativeModule();
    try {
      await stopExpoPlayer();
      const source = await resolveNativeRingtone(ringtone);
      const result = await module.startAlarm(sessionId, source.uri, source.sourceType);
      activeSessionId = sessionId;
      activeRingtoneId = ringtone.id;
      logAudio('real-native', { sessionId, sourceType: source.sourceType, alreadyActive: result?.alreadyActive === true, audioFocusAcquired: result?.audioFocusAcquired === true });
      if (__DEV__) {
        if (result?.volume) console.log('[alarm-native-volume]', result.volume);
        console.log('[alarm-native-player]', { action: result?.alreadyActive ? 'already-active' : 'start', sourceType: source.sourceType, usage: 'USAGE_ALARM' });
      }
      return { started: result?.started === true, alreadyActive: result?.alreadyActive === true, ringtoneId: ringtone.id };
    } catch (error) {
      if (__DEV__) console.log('[alarm-native-player]', { action: 'start-failed', sourceType: ringtone.custom ? 'custom' : 'builtIn', usage: 'USAGE_ALARM', errorCode: error?.code ?? 'NATIVE_PLAYER_ERROR' });
      try {
        const fallback = getRingtoneById(DEFAULT_RINGTONE_ID);
        const fallbackSource = await resolveNativeRingtone(fallback);
        const result = await module.startAlarm(sessionId, fallbackSource.uri, 'fallback');
        activeSessionId = sessionId;
        activeRingtoneId = fallback.id;
        logAudio('real-native', { sessionId, sourceType: 'fallback', audioFocusAcquired: result?.audioFocusAcquired === true });
        if (__DEV__) {
          if (result?.volume) console.log('[alarm-native-volume]', result.volume);
          console.log('[alarm-native-player]', { action: 'start', sourceType: 'fallback', usage: 'USAGE_ALARM' });
        }
        return { started: result?.started === true, alreadyActive: result?.alreadyActive === true, ringtoneId: fallback.id, fallback: true };
      } catch (fallbackError) {
        if (__DEV__) console.log('[alarm-native-player]', { action: 'fallback-failed', sourceType: 'fallback', usage: 'USAGE_ALARM', errorCode: fallbackError?.code ?? 'NATIVE_PLAYER_ERROR' });
        return startExpoFallback(sessionId, ringtone);
      }
    }
  }
  return startExpoFallback(sessionId, ringtone);
}

export async function stopAlarmPlayback(sessionId, options = {}) {
  if (activeSessionId && sessionId && activeSessionId !== sessionId) return false;
  await forceStopAlarmPlayback(options);
  return true;
}

export async function restartAlarmPlayback(sessionId, ringtoneId) {
  await forceStopAlarmPlayback({ restoreSystemVolume: false });
  return startAlarmPlayback(sessionId, ringtoneId);
}

export async function forceStopAlarmPlayback(options = {}) {
  const { restoreSystemVolume = true, clearSystemVolumeSnapshot = false, hasNextRinging = false } = options;
  if (Platform.OS === 'android') {
    try {
      const result = await getNativeModule().stopAlarm();
      if (__DEV__ && result?.stopped) console.log('[alarm-native-player]', { action: 'stop', sourceType: 'active', usage: 'USAGE_ALARM' });
    } catch (error) {
      if (__DEV__) console.log('[alarm-native-player]', { action: 'stop-failed', errorCode: error?.code ?? 'NATIVE_PLAYER_ERROR' });
    }
  }
  await stopExpoPlayer();
  activeSessionId = undefined;
  activeRingtoneId = undefined;
  await setAudioModeAsync({ shouldPlayInBackground: false });
  if (restoreSystemVolume) {
    if (clearSystemVolumeSnapshot) await releaseAlarmStreamVolumeSnapshot({ hasNextRinging });
    else await restoreAlarmStreamVolume();
  }
}

export async function previewRingtone(ringtoneId) {
  await assertNoActiveAlarmSession();
  await forceStopAlarmPlayback();
  const ringtone = await resolveRingtoneSource(ringtoneId);
  await setAudioModeAsync({ interruptionMode: 'doNotMix', playsInSilentMode: true, shouldPlayInBackground: false });
  const resolved = createExpoPlayerWithFallback(ringtone);
  expoPlayer = resolved.nextPlayer;
  expoPlayerMode = 'preview';
  activeRingtoneId = resolved.resolvedRingtone.id;
  expoPlayer.loop = false;
  setExpoPlayerVolume();
  try { expoPlayer.play(); }
  catch {
    const fallback = getRingtoneById(DEFAULT_RINGTONE_ID);
    expoPlayer.remove();
    expoPlayer = createAudioPlayer(fallback.source, { downloadFirst: true });
    activeRingtoneId = fallback.id;
    expoPlayer.loop = false;
    setExpoPlayerVolume();
    expoPlayer.play();
  }
  logAudio('preview-expo', { sourceType: ringtone.custom ? 'custom' : 'builtIn' });
  return { played: true, ringtoneId: activeRingtoneId };
}

export async function stopRingtonePreviewIfActive(ringtoneId) {
  if (activeRingtoneId === ringtoneId && !activeSessionId && expoPlayerMode === 'preview') await forceStopAlarmPlayback();
}

export const stopAlarmAudio = forceStopAlarmPlayback;
export const releaseAlarmAudio = forceStopAlarmPlayback;
