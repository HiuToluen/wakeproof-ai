const fs = require('fs');
const path = require('path');

// google-services.json holds Firebase Android credentials and is gitignored, so
// it is not present on every machine. Only wire it into the Android config when
// the file actually exists — this lets contributors without it still prebuild
// and run the app (Google native sign-in is the only feature that needs it).
const googleServicesPath = process.env.GOOGLE_SERVICES_JSON || './google-services.json';
const hasGoogleServices = fs.existsSync(path.resolve(__dirname, googleServicesPath));

module.exports = {
  expo: {
    name: 'WakeProof AI',
    slug: 'wakeproof-ai',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'wakeproofai',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.se1928.group5.wakeproofai',
    },
    android: {
      package: 'com.se1928.group5.wakeproofai',
      permissions: [
        'POST_NOTIFICATIONS',
        'VIBRATE',
        'SCHEDULE_EXACT_ALARM',
        'android.permission.CAMERA',
        'android.permission.MODIFY_AUDIO_SETTINGS',
      ],
      // Only set when the credentials file exists (see hasGoogleServices above).
      ...(hasGoogleServices ? { googleServicesFile: googleServicesPath } : {}),
    },
    web: {
      output: 'single',
    },
    plugins: [
      'expo-sqlite',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow WakeProof AI to access your camera for wake verification.',
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-audio',
        {
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-notifications',
        {
          sounds: [
            './assets/musics/brr_brr_patapim_alarm_brainrot.mp3',
            './assets/musics/dream_alarm.mp3',
            './assets/musics/nhac_chuong_bao_thuc_coi_bao_dong.mp3',
            './assets/musics/nhac_chuong_bao_thuc_cuc_to.mp3',
          ],
        },
      ],
      'expo-asset',
      // Google native sign-in needs the Firebase credentials file; skip its
      // config plugin when the file is absent so prebuild still succeeds.
      ...(hasGoogleServices ? ['@react-native-google-signin/google-signin'] : []),
    ],
    extra: {
      eas: {
        projectId: '30dee5b3-8ca2-4be3-af4c-6f9301b1b4cd',
      },
    },
  },
};
