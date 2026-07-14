import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export const CHALLENGE_IMAGE_MAX_WIDTH = 768;
export const CHALLENGE_IMAGE_JPEG_QUALITY = 0.6;

function getApproximateFileSize(uri) {
  try {
    const file = new File(uri);
    return typeof file.size === 'number' ? file.size : null;
  } catch {
    return null;
  }
}

export async function compressChallengeImage(image) {
  const startedAt = Date.now();
  const width = image.width && image.width > CHALLENGE_IMAGE_MAX_WIDTH ? CHALLENGE_IMAGE_MAX_WIDTH : image.width;
  const actions = width ? [{ resize: { width } }] : [];
  const result = await ImageManipulator.manipulateAsync(image.uri, actions, { compress: CHALLENGE_IMAGE_JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG });
  const approximateFileSize = getApproximateFileSize(result.uri);
  if (__DEV__) console.log('[challenge-image] processed', { width: result.width, height: result.height, approximateFileSize, durationMs: Date.now() - startedAt });
  return { uri: result.uri, width: result.width, height: result.height, approximateFileSize };
}
