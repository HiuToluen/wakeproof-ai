import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { createUserWithEmailAndPassword, EmailAuthProvider, GoogleAuthProvider, linkWithCredential, onAuthStateChanged, reauthenticateWithCredential, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signOut, updatePassword, updateProfile } from 'firebase/auth';

import { auth } from '../config/firebase';
import { createUserProfileIfMissing } from './userProfileService';

let googleConfigured = false;

function configureGoogleSignIn() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  googleConfigured = true;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUser(user) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || '',
    photoURL: user.photoURL || null,
  };
}

async function getGoogleCredential() {
  configureGoogleSignIn();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    const idToken = result?.data?.idToken || result?.idToken;
    if (!idToken) throw { code: 'GOOGLE_MISSING_ID_TOKEN' };
    return GoogleAuthProvider.credential(idToken);
  } catch (error) {
    if (error?.code === statusCodes.SIGN_IN_CANCELLED) throw { code: 'GOOGLE_SIGN_IN_CANCELLED' };
    if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw { code: 'GOOGLE_PLAY_SERVICES_UNAVAILABLE' };
    throw error;
  }
}

export function getLinkedProviders(user = auth.currentUser) {
  const providerIds = user?.providerData?.map((provider) => provider.providerId) || [];
  return {
    providerIds,
    hasPasswordProvider: providerIds.includes('password'),
    hasGoogleProvider: providerIds.includes('google.com'),
  };
}

export async function registerWithEmail({ email, password, displayName }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(displayName || '').trim();
  if (!normalizedName) throw { code: 'auth/missing-display-name' };
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  await updateProfile(credential.user, { displayName: normalizedName });
  await createUserProfileIfMissing(credential.user, {
    displayName: normalizedName,
    email: normalizedEmail,
    authProvider: 'password',
  });
  return normalizeUser(credential.user);
}

export async function signInWithEmail({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  await createUserProfileIfMissing(credential.user, { authProvider: 'password' });
  return normalizeUser(credential.user);
}

export async function signInWithGoogle() {
  const googleCredential = await getGoogleCredential();
  const userCredential = await signInWithCredential(auth, googleCredential);
  await createUserProfileIfMissing(userCredential.user, {
    displayName: userCredential.user.displayName || '',
    email: userCredential.user.email || '',
    photoURL: userCredential.user.photoURL || null,
    authProvider: 'google',
  });
  return normalizeUser(userCredential.user);
}

export async function setPasswordForCurrentUser(newPassword) {
  const currentUser = auth.currentUser;
  if (!currentUser?.email) throw { code: 'auth/missing-current-user' };
  const credential = EmailAuthProvider.credential(currentUser.email, newPassword);
  const linked = await linkWithCredential(currentUser, credential);
  await linked.user.reload();
  return getLinkedProviders(linked.user);
}

export async function changePassword({ currentPassword, newPassword }) {
  const currentUser = auth.currentUser;
  if (!currentUser?.email) throw { code: 'auth/missing-current-user' };
  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, newPassword);
  await currentUser.reload();
  return getLinkedProviders(currentUser);
}

export async function linkGoogleToCurrentUser() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw { code: 'auth/missing-current-user' };
  const uid = currentUser.uid;
  const googleCredential = await getGoogleCredential();
  try {
    const linked = await linkWithCredential(currentUser, googleCredential);
    if (linked.user.uid !== uid) throw { code: 'auth/provider-link-uid-mismatch' };
    await linked.user.reload();
    return getLinkedProviders(linked.user);
  } catch (error) {
    if (['auth/credential-already-in-use', 'auth/email-already-in-use', 'auth/account-exists-with-different-credential'].includes(error?.code)) throw { code: 'auth/google-link-collision' };
    throw error;
  }
}

export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, normalizeEmail(email));
}

export async function signOutUser() {
  await signOut(auth);
  try {
    configureGoogleSignIn();
    if (await GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signOut();
  } catch {}
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
