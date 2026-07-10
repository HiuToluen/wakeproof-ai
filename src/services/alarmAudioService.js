import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { getRingtoneById } from '../constants/alarmConstants';
import { assertNoActiveAlarmSession } from './alarmMutationGuard';

export const INITIAL_ALARM_VOLUME = 0.25;
export const MAX_ALARM_VOLUME = 1;
export const VOLUME_STEP = 0.1;
export const VOLUME_STEP_INTERVAL_MS = 3000;

let player;
let activeSessionId;
let activeRingtoneId;
let volumeRampInterval;
let currentVolume = INITIAL_ALARM_VOLUME;

export function resetAlarmVolume() {
  currentVolume = INITIAL_ALARM_VOLUME;
  if (player) player.volume = currentVolume;
}

export function stopVolumeRamp() {
  if (volumeRampInterval) {
    clearInterval(volumeRampInterval);
    volumeRampInterval = undefined;
  }
}

export function startVolumeRamp(sessionId) {
  stopVolumeRamp();
  if (!player || activeSessionId !== sessionId) return;
  volumeRampInterval = setInterval(() => {
    if (!player || activeSessionId !== sessionId) {
      stopVolumeRamp();
      return;
    }
    currentVolume = Math.min(MAX_ALARM_VOLUME, currentVolume + VOLUME_STEP);
    player.volume = currentVolume;
    if (currentVolume >= MAX_ALARM_VOLUME) stopVolumeRamp();
  }, VOLUME_STEP_INTERVAL_MS);
}

export async function startAlarmPlayback(sessionId, ringtoneId) {
  if (player && activeSessionId === sessionId && activeRingtoneId === ringtoneId) {
    if (!volumeRampInterval && currentVolume < MAX_ALARM_VOLUME) startVolumeRamp(sessionId);
    return { started: false, alreadyActive: true };
  }

  await forceStopAlarmPlayback();
  const ringtone = getRingtoneById(ringtoneId);
  await setAudioModeAsync({ interruptionMode: 'doNotMix', playsInSilentMode: true, shouldPlayInBackground: false });
  player = createAudioPlayer(ringtone.source, { downloadFirst: true });
  activeSessionId = sessionId;
  activeRingtoneId = ringtone.id;
  resetAlarmVolume();
  player.loop = true;
  player.play();
  startVolumeRamp(sessionId);
  return { started: true, ringtoneId: ringtone.id };
}

export async function stopAlarmPlayback(sessionId) {
  if (activeSessionId && sessionId && activeSessionId !== sessionId) return false;
  await forceStopAlarmPlayback();
  return true;
}

export async function restartAlarmPlayback(sessionId, ringtoneId) {
  await forceStopAlarmPlayback();
  resetAlarmVolume();
  return startAlarmPlayback(sessionId, ringtoneId);
}

export async function forceStopAlarmPlayback() {
  stopVolumeRamp();
  if (player) {
    player.pause();
    player.remove();
    player = undefined;
  }
  activeSessionId = undefined;
  activeRingtoneId = undefined;
  resetAlarmVolume();
  await setAudioModeAsync({ shouldPlayInBackground: false });
}

export async function previewRingtone(ringtoneId) {
  await assertNoActiveAlarmSession();
  await forceStopAlarmPlayback();
  const ringtone = getRingtoneById(ringtoneId);
  await setAudioModeAsync({ interruptionMode: 'doNotMix', playsInSilentMode: true, shouldPlayInBackground: false });
  player = createAudioPlayer(ringtone.source, { downloadFirst: true });
  activeRingtoneId = ringtone.id;
  player.loop = false;
  player.volume = 1;
  player.play();
  return { played: true, ringtoneId: ringtone.id };
}

export const stopAlarmAudio = forceStopAlarmPlayback;
export const releaseAlarmAudio = forceStopAlarmPlayback;
