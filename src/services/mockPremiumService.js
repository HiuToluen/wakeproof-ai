// MOCK: In-app purchase is fully simulated client-side for a class project.
// There is no real App Store / Play Store billing integration. These functions
// write plan and subscription fields directly to Firestore, bypassing the
// protected-field filter in `userProfileService.updateUserProfile()` so the
// mock IAP can toggle Premium status. The protected-field filter remains in
// place for normal profile updates.
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from '../config/firebase';
import { FREE_PLAN_VALUE, PREMIUM_PLAN_VALUE } from '../constants/premiumConstants';

/**
 * MOCK: Upgrades a user to the PREMIUM plan by writing directly to the
 * `users/{uid}` Firestore document. This bypasses the protected-field filter
 * in `userProfileService.updateUserProfile()` so the mock IAP can set plan
 * and subscription fields.
 *
 * @param {string} uid - The authenticated user's UID.
 * @returns {Promise<void>}
 */
export async function upgradeToPremium(uid) {
  if (!uid) throw new Error('Missing user ID.');
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    plan: PREMIUM_PLAN_VALUE,
    subscriptionStatus: 'ACTIVE',
    subscriptionStartedAt: serverTimestamp(),
    subscriptionSource: 'MOCK_IAP',
    subscriptionExpiresAt: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * MOCK: Reverts a user to the FREE plan by writing directly to the
 * `users/{uid}` Firestore document. This bypasses the protected-field filter
 * in `userProfileService.updateUserProfile()` so the mock IAP can clear plan
 * and subscription fields.
 *
 * @param {string} uid - The authenticated user's UID.
 * @returns {Promise<void>}
 */
export async function revertToFree(uid) {
  if (!uid) throw new Error('Missing user ID.');
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    plan: FREE_PLAN_VALUE,
    subscriptionStatus: 'INACTIVE',
    subscriptionStartedAt: null,
    subscriptionExpiresAt: null,
    subscriptionSource: null,
    updatedAt: serverTimestamp(),
  });
}
