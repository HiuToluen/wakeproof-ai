import { Platform } from 'react-native';

let nativeModule;

function getNativeModule() {
  if (Platform.OS !== 'android') return null;
  if (!nativeModule) nativeModule = require('../../modules/wake-proof-alarm-audio').default;
  return nativeModule;
}

function logVolume(action, result) {
  if (__DEV__) console.log('[alarm-native-volume]', { action, ...result });
}

export async function maximizeAlarmStreamVolume() {
  try {
    const module = getNativeModule();
    if (!module) return false;
    const result = await module.maximizeAlarmVolume();
    logVolume('maximize', result);
    return result?.isMax === true;
  } catch (error) {
    if (__DEV__) console.log('[alarm-native-volume]', { action: 'maximize-failed', errorCode: error?.code ?? 'NATIVE_VOLUME_ERROR' });
    return false;
  }
}

export async function restoreAlarmStreamVolume({ clearSnapshot = false } = {}) {
  try {
    const module = getNativeModule();
    if (!module) return false;
    const result = await module.restoreAlarmVolume(clearSnapshot);
    if (result?.reason !== 'NO_SNAPSHOT') logVolume('restore', result);
    return result?.restored === true;
  } catch (error) {
    if (__DEV__) console.log('[alarm-native-volume]', { action: 'restore-failed', errorCode: error?.code ?? 'NATIVE_VOLUME_ERROR' });
    return false;
  }
}

export async function releaseAlarmStreamVolumeSnapshot({ hasNextRinging = false } = {}) {
  if (hasNextRinging) return false;
  return restoreAlarmStreamVolume({ clearSnapshot: true });
}

export async function getAlarmVolumeInfo() {
  const module = getNativeModule();
  return module ? module.getAlarmVolumeInfo() : null;
}
