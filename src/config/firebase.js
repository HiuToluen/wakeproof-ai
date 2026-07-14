import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';

// Whether real Firebase credentials are configured via env. When false (e.g. a
// fresh clone without a .env), we fall back to a syntactically valid placeholder
// config so the app can still boot and the UI is browsable — any network-backed
// auth/firestore call will fail gracefully rather than crashing at startup.
export const isFirebaseConfigured = Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);

const firebaseConfig = isFirebaseConfigured
  ? {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    }
  : {
      // Placeholder values with valid formats — enough for initializeApp/getAuth
      // to succeed without throwing auth/invalid-api-key. Not a working backend.
      apiKey: 'AIzaSyDEV-PLACEHOLDER-KEY-000000000000000',
      authDomain: 'wakeproof-dev.firebaseapp.com',
      projectId: 'wakeproof-dev',
      storageBucket: 'wakeproof-dev.appspot.com',
      messagingSenderId: '000000000000',
      appId: '1:000000000000:android:0000000000000000000000',
    };

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authInstance;
try {
  authInstance = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  authInstance = getAuth(firebaseApp);
}

export const auth = authInstance;
export const db = getFirestore(firebaseApp);
