// useCredits hook.
//
// Reactive wrapper around the dual-storage credit service (Firestore for
// authenticated users, SQLite app_meta for guests). Exposes the current
// balance plus earn / spend helpers used by the Settings screen and the
// AlarmRinging snooze flow.
//
// MOCK context: ads that grant credits are simulated client-side by the
// calling component (MockAdOverlay). This hook only handles the credit
// addition after an ad completes - it does NOT render the overlay itself.
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { CREDITS_PER_AD, snoozeCreditCost } from '../constants/premiumConstants';
import * as creditService from '../services/creditService';

/**
 * Hook for the snooze credit system.
 *
 * Returns:
 *   - credits: number. Reactive state, refreshed on mount and after every
 *     earn/spend operation. Reads from Firestore (authed) or SQLite (guest).
 *   - refreshCredits(): re-reads the balance from the credit service and
 *     updates state.
 *   - watchAdAndEarn(): adds `CREDITS_PER_AD` credits after an ad is watched
 *     and refreshes state. The actual ad overlay is managed by the calling
 *     component; this function only performs the credit addition. Returns a
 *     promise that resolves when the credits have been added.
 *   - spendForSnooze(snoozeCount): calculates the cost via
 *     `snoozeCreditCost(snoozeCount)`, attempts to spend it, and returns
 *     `{ success, deficit }`. `deficit` is 0 on success, or the missing
 *     credit count on failure.
 *   - earnCredits(amount): bulk-earn helper used by the inline snooze ad
 *     flow when a deficit must be covered before spending.
 *
 * @returns {{
 *   credits: number,
 *   refreshCredits: () => Promise<void>,
 *   watchAdAndEarn: () => Promise<void>,
 *   spendForSnooze: (snoozeCount: number) => Promise<{success: boolean, deficit: number}>,
 *   earnCredits: (amount: number) => Promise<void>,
 * }}
 */
export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);

  const refreshCredits = useCallback(async () => {
    try {
      const balance = await creditService.getCredits(user);
      setCredits(Number.isInteger(balance) && balance > 0 ? balance : 0);
    } catch (error) {
      // Swallow read errors: keep the last known balance rather than crashing.
      // eslint-disable-next-line no-console
      console.warn('useCredits: failed to read balance', error);
    }
  }, [user]);

  // Re-read whenever the auth state changes (guest <-> authed).
  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  const watchAdAndEarn = useCallback(async () => {
    // MOCK: the calling component has already shown the MockAdOverlay and
    // confirmed the ad completed. Here we just add the credits.
    await creditService.addCredits(user, CREDITS_PER_AD);
    await refreshCredits();
  }, [user, refreshCredits]);

  const earnCredits = useCallback(async (amount) => {
    if (!Number.isInteger(amount) || amount <= 0) return;
    await creditService.addCredits(user, amount);
    await refreshCredits();
  }, [user, refreshCredits]);

  const spendForSnooze = useCallback(async (snoozeCount) => {
    const cost = snoozeCreditCost(snoozeCount);
    const current = await creditService.getCredits(user);

    if (current < cost) {
      // Insufficient balance: do not spend anything, report the deficit.
      return { success: false, deficit: cost - current };
    }

    const ok = await creditService.spendCredits(user, cost);
    await refreshCredits();
    return { success: ok, deficit: ok ? 0 : cost };
  }, [user, refreshCredits]);

  return { credits, refreshCredits, watchAdAndEarn, spendForSnooze, earnCredits };
}

export default useCredits;
