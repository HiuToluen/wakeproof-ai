import { statusCodes } from '@react-native-google-signin/google-signin';

const firebaseMessages = {
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/email-already-in-use': 'This email is already associated with an existing WakeProof AI account. Sign in using the original method, then add another sign-in method from Settings.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'The current password is incorrect.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'If an account with this email can use password sign-in, a reset email has been sent.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/requires-recent-login': 'Please sign out and sign in again before changing this security setting.',
  'auth/credential-already-in-use': 'This Google account is already linked to another WakeProof AI account.',
  'auth/account-exists-with-different-credential': 'This email is already registered using another sign-in method. Sign in with the original method, then link Google from Settings.',
  'auth/provider-already-linked': 'This sign-in method is already connected.',
  'auth/google-link-collision': 'This Google account is already linked to another WakeProof AI account.',
  'auth/missing-current-user': 'Please sign in again and try this action.',
  'auth/missing-display-name': 'Enter your display name.',
  'auth/provider-link-uid-mismatch': 'Unable to link this sign-in method safely. Please try again.',
};

export function isGoogleCancelError(error) {
  return error?.code === statusCodes.SIGN_IN_CANCELLED || error?.code === 'GOOGLE_SIGN_IN_CANCELLED';
}

export function mapFirebaseError(error) {
  if (isGoogleCancelError(error)) return 'Google Sign-In was cancelled.';
  if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE || error?.code === 'GOOGLE_PLAY_SERVICES_UNAVAILABLE') return 'Google Play Services is unavailable or needs to be updated.';
  if (error?.code === 'GOOGLE_MISSING_ID_TOKEN') return 'Google Sign-In did not return an ID token. Please try again.';
  if (error?.code === statusCodes.IN_PROGRESS) return 'Google Sign-In is already in progress.';
  if (error?.code === 'GOOGLE_CONFIGURATION_ERROR') return 'Google Sign-In is not configured correctly for this build.';
  return firebaseMessages[error?.code] || 'Something went wrong. Please try again.';
}
