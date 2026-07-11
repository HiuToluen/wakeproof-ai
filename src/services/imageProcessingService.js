import * as ImageManipulator from 'expo-image-manipulator';

export async function compressChallengeImage(image) {
  const width = image.width && image.width > 1024 ? 1024 : image.width;
  const actions = width ? [{ resize: { width } }] : [];
  const result = await ImageManipulator.manipulateAsync(image.uri, actions, { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
  return { uri: result.uri, width: result.width, height: result.height };
}
