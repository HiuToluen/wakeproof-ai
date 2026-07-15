import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';

import { DEFAULT_RINGTONE_ID, getRingtoneById, RINGTONES } from '../constants/alarmConstants';
import { countAlarmsUsingRingtone, createCustomRingtone, deleteCustomRingtoneMetadata, getCustomRingtoneById, getCustomRingtones } from '../database/customRingtoneRepository';

export const MAX_CUSTOM_RINGTONE_SIZE_BYTES = 25 * 1024 * 1024;

const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/ogg'];
const MIME_EXTENSION_MAP = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/aac': 'aac', 'audio/ogg': 'ogg' };
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'aac', 'ogg'];
const CUSTOM_RINGTONE_PREFIX = 'custom_';
const MAX_DISPLAY_NAME_LENGTH = 80;
const SIZE_ERROR = 'Audio file is too large. Maximum size is 25 MB.';
const FORMAT_ERROR = 'Unsupported audio format. Please select an MP3, M4A, WAV, AAC, or OGG file.';
const LOAD_ERROR = 'This audio file could not be used as a ringtone.';
const KNOWN_IMPORT_ERRORS = new Set([SIZE_ERROR, FORMAT_ERROR, LOAD_ERROR, 'Unable to read the selected audio file.', 'The selected audio file could not be accessed.', 'Unable to save the audio file locally.', 'Unable to save this custom ringtone. Please try again.']);

function friendlyError(message) {
  return new Error(message);
}

function sanitizeName(name) {
  return String(name || 'Custom Ringtone').replace(/\.[^/.]+$/, '').trim().slice(0, MAX_DISPLAY_NAME_LENGTH) || 'Custom Ringtone';
}

function getRawExtension(value) {
  const match = String(value || '').match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
  return match?.[1]?.toLowerCase() || '';
}

function getMimeType(asset, source) {
  return String(asset?.mimeType || source?.type || '').toLowerCase();
}

function extensionFromMime(mime) {
  return MIME_EXTENSION_MAP[mime] || '';
}

function getValidatedExtension(asset, source) {
  const mime = getMimeType(asset, source);
  const extension = getRawExtension(asset?.name) || getRawExtension(asset?.uri);
  const mimeExtension = extensionFromMime(mime);
  if (mime && !mime.startsWith('audio/')) throw friendlyError(FORMAT_ERROR);
  if (mimeExtension) return mimeExtension;
  if (mime) throw friendlyError(FORMAT_ERROR);
  if (extension && AUDIO_EXTENSIONS.includes(extension)) return extension;
  throw friendlyError(FORMAT_ERROR);
}

function getSize(value) {
  const size = Number(value);
  return Number.isFinite(size) ? size : null;
}

function validateSize(size) {
  if (size == null) return;
  if (size <= 0) throw friendlyError(LOAD_ERROR);
  if (size > MAX_CUSTOM_RINGTONE_SIZE_BYTES) throw friendlyError(SIZE_ERROR);
}

function getRingtoneDirectory() {
  return new Directory(Paths.document, 'custom-ringtones');
}

function safeDeleteFile(file) {
  try {
    if (file?.exists) file.delete();
  } catch {
    console.warn('Unable to clean up custom ringtone file.');
  }
}

function createCustomId() {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  return `${CUSTOM_RINGTONE_PREFIX}${random.replaceAll('-', '_')}`;
}

async function validatePlayable(file) {
  let testPlayer;
  try {
    await setAudioModeAsync({ interruptionMode: 'doNotMix', playsInSilentMode: true, shouldPlayInBackground: false });
    testPlayer = createAudioPlayer({ uri: file.uri }, { downloadFirst: true });
    testPlayer.volume = 0;
  } catch {
    throw friendlyError(LOAD_ERROR);
  } finally {
    try { testPlayer?.remove(); } catch {}
    await setAudioModeAsync({ shouldPlayInBackground: false }).catch(() => {});
  }
}

export function isCustomRingtoneId(id) {
  return String(id || '').startsWith(CUSTOM_RINGTONE_PREFIX);
}

export async function listCustomRingtones() {
  return getCustomRingtones();
}

export async function isCustomRingtoneAvailable(id) {
  try {
    const ringtone = await getCustomRingtoneById(id);
    if (!ringtone?.fileUri) return false;
    const file = new File(ringtone.fileUri);
    return file.exists && file.size > 0;
  } catch {
    return false;
  }
}

async function getDocumentPicker() {
  try {
    return await import('expo-document-picker');
  } catch {
    throw friendlyError('Custom ringtone import requires a rebuilt development build with document picker support.');
  }
}

export async function resolveRingtoneSource(ringtoneId) {
  const builtin = RINGTONES.find((ringtone) => ringtone.id === ringtoneId);
  if (builtin) return builtin;
  if (isCustomRingtoneId(ringtoneId)) {
    try {
      const custom = await getCustomRingtoneById(ringtoneId);
      if (custom?.fileUri) {
        const file = new File(custom.fileUri);
        if (file.exists && file.size > 0) return { id: custom.id, label: custom.name, source: { uri: custom.fileUri }, custom: true };
      }
    } catch {}
  }
  return getRingtoneById(DEFAULT_RINGTONE_ID);
}

export async function importCustomRingtone() {
  const DocumentPicker = await getDocumentPicker();
  const result = await DocumentPicker.getDocumentAsync({
    type: AUDIO_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) throw friendlyError('Unable to read the selected audio file.');
  const metadataSize = getSize(asset.size);
  validateSize(metadataSize);
  let destination;
  try {
    const source = new File(asset);
    if (!source.exists) throw friendlyError('The selected audio file could not be accessed.');
    const extension = getValidatedExtension(asset, source);
    if (metadataSize == null) validateSize(getSize(source.size));
    const directory = getRingtoneDirectory();
    directory.create({ idempotent: true, intermediates: true });
    const id = createCustomId();
    destination = new File(directory, `${id}.${extension}`);
    source.copy(destination);
    if (!destination.exists) throw friendlyError('Unable to save the audio file locally.');
    validateSize(getSize(destination.size));
    await validatePlayable(destination);
    const now = new Date().toISOString();
    try {
      return await createCustomRingtone({ id, name: sanitizeName(asset.name), fileUri: destination.uri, mimeType: getMimeType(asset, source) || null, createdAt: now, updatedAt: now });
    } catch {
      safeDeleteFile(destination);
      throw friendlyError('Unable to save this custom ringtone. Please try again.');
    }
  } catch (error) {
    if (destination) safeDeleteFile(destination);
    if (KNOWN_IMPORT_ERRORS.has(error.message)) throw error;
    throw friendlyError('Unable to import this audio file. Please try another file.');
  }
}

export async function deleteCustomRingtone(id) {
  const usageCount = await countAlarmsUsingRingtone(id);
  if (usageCount > 0) throw friendlyError(`This ringtone is used by ${usageCount} alarm${usageCount === 1 ? '' : 's'}. Choose another ringtone for those alarms before deleting it.`);
  const ringtone = await getCustomRingtoneById(id);
  if (!ringtone) return;
  const file = ringtone.fileUri ? new File(ringtone.fileUri) : null;
  if (file?.exists) {
    try { file.delete(); }
    catch { throw friendlyError('Unable to delete the local audio file. Please try again.'); }
  }
  await deleteCustomRingtoneMetadata(id);
}
