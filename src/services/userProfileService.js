import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { db } from '../config/firebase';

const subscriptionDefaults = {
  plan: 'FREE',
  subscriptionStatus: 'INACTIVE',
  subscriptionStartedAt: null,
  subscriptionExpiresAt: null,
  subscriptionSource: null,
};

const PROTECTED_PROFILE_FIELDS = new Set(['plan', 'subscriptionStatus', 'subscriptionStartedAt', 'subscriptionExpiresAt', 'subscriptionSource', 'createdAt']);

function profileFromUser(user, extraData = {}) {
  return {
    displayName: extraData.displayName || user.displayName || '',
    email: extraData.email || user.email || '',
    photoURL: extraData.photoURL || user.photoURL || null,
    authProvider: extraData.authProvider || user.providerData?.[0]?.providerId || 'password',
    ...subscriptionDefaults,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function createUserProfileIfMissing(user, extraData = {}) {
  if (!user?.uid) throw new Error('Missing authenticated user.');
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) return snapshot.data();
  const profile = profileFromUser(user, extraData);
  await setDoc(userRef, profile);
  return profile;
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function updateUserProfile(uid, updates) {
  if (!uid) throw new Error('Missing user ID.');
  const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([key]) => !PROTECTED_PROFILE_FIELDS.has(key)));
  await updateDoc(doc(db, 'users', uid), {
    ...safeUpdates,
    updatedAt: serverTimestamp(),
  });
}
