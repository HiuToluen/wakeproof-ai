// usePremium hook.
//
// Derives the user's Premium status from the AuthContext profile and exposes
// MOCK IAP actions (upgrade / revert) that write directly to Firestore via
// `mockPremiumService` and then refresh the profile so every screen using
// `useAuth()` re-renders with the new plan.
import { useCallback, useMemo } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { PREMIUM_PLAN_VALUE } from '../constants/premiumConstants';
import * as mockPremiumService from '../services/mockPremiumService';

/**
 * Determines whether a profile represents an active Premium subscription.
 * Guests (null profile) and free users both return false.
 *
 * @param {object|null} profile - The userProfile object from AuthContext.
 * @returns {boolean}
 */
function isPremiumProfile(profile) {
  return Boolean(
    profile &&
      profile.plan === PREMIUM_PLAN_VALUE &&
      profile.subscriptionStatus === 'ACTIVE',
  );
}

/**
 * Hook for Premium subscription state and MOCK IAP actions.
 *
 * Returns:
 *   - isPremium: boolean. True only when `userProfile.plan === 'PREMIUM'`
 *     and `userProfile.subscriptionStatus === 'ACTIVE'`. False for guests
 *     and free users.
 *   - upgrade(): writes Premium fields to Firestore then refreshes the
 *     profile via `refreshUserProfile()`.
 *   - revert(): writes Free fields to Firestore then refreshes the profile.
 *
 * @returns {{
 *   isPremium: boolean,
 *   upgrade: () => Promise<void>,
 *   revert: () => Promise<void>,
 * }}
 */
export function usePremium() {
  const { user, userProfile, refreshUserProfile } = useAuth();

  const isPremium = useMemo(() => isPremiumProfile(userProfile), [userProfile]);

  const upgrade = useCallback(async () => {
    if (!user?.uid) throw new Error('Sign in required to upgrade to Premium.');
    // MOCK: bypasses the protected-field filter intentionally (class project).
    await mockPremiumService.upgradeToPremium(user.uid);
    await refreshUserProfile();
  }, [user, refreshUserProfile]);

  const revert = useCallback(async () => {
    if (!user?.uid) throw new Error('Sign in required to manage subscription.');
    // MOCK: bypasses the protected-field filter intentionally (class project).
    await mockPremiumService.revertToFree(user.uid);
    await refreshUserProfile();
  }, [user, refreshUserProfile]);

  return { isPremium, upgrade, revert };
}

export default usePremium;
