import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { DEFAULT_RINGTONE_ID, getRingtoneById } from '../constants/alarmConstants';
import { resolveRingtoneSource } from './customRingtoneService';
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

function createPlayerWithFallback(ringtone) {
  try {
    return { nextPlayer: createAudioPlayer(ringtone.source, { downloadFirst: true }), resolvedRingtone: ringtone };
  } catch {
    const fallback = getRingtoneById(DEFAULT_RINGTONE_ID);
    return { nextPlayer: createAudioPlayer(fallback.source, { downloadFirst: true }), resolvedRingtone: fallback };
  }
}

export async function startAlarmPlayback(sessionId, ringtoneId) {
  if (player && activeSessionId === sessionId && activeRingtoneId === ringtoneId) {
    if (!volumeRampInterval && currentVolume < MAX_ALARM_VOLUME) startVolumeRamp(sessionId);
    return { started: false, alreadyActive: true };
  }

  await forceStopAlarmPlayback();
  const ringtone = await resolveRingtoneSource(ringtoneId);
  await setAudioModeAsync({ interruptionMode: 'doNotMix', playsInSilentMode: true, shouldPlayInBackground: false });
  const resolved = createPlayerWithFallback(ringtone);
  player = resolved.nextPlayer;
  activeSessionId = sessionId;
  activeRingtoneId = resolved.resolvedRingtone.id;
  resetAlarmVolume();
  player.loop = true;
  try { player.play(); }
  catch {
    const fallback = getRingtoneById(DEFAULT_RINGTONE_ID);
    player.remove();
    player = createAudioPlayer(fallback.source, { downloadFirst: true });
    activeRingtoneId = fallback.id;
    resetAlarmVolume();
    player.loop = true;
    player.play();
  }
  startVolumeRamp(sessionId);
  return { started: true, ringtoneId: activeRingtoneId };
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
  const ringtone = await resolveRingtoneSource(ringtoneId);
  await setAudioModeAsync({ interruptionMode: 'doNotMix', playsInSilentMode: true, shouldPlayInBackground: false });
  const resolved = createPlayerWithFallback(ringtone);
  player = resolved.nextPlayer;
  activeRingtoneId = resolved.resolvedRingtone.id;
  player.loop = false;
  player.volume = 1;
  try { player.play(); }
  catch {
    const fallback = getRingtoneById(DEFAULT_RINGTONE_ID);
    player.remove();
    player = createAudioPlayer(fallback.source, { downloadFirst: true });
    activeRingtoneId = fallback.id;
    player.loop = false;
    player.volume = 1;
    player.play();
  }
  return { played: true, ringtoneId: activeRingtoneId };
}

export async function stopRingtonePreviewIfActive(ringtoneId) {
  if (activeRingtoneId === ringtoneId && !activeSessionId) await forceStopAlarmPlayback();
}

export const stopAlarmAudio = forceStopAlarmPlayback;
export const releaseAlarmAudio = forceStopAlarmPlayback;
