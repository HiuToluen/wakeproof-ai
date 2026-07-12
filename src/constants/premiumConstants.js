// Premium and credit system constants.
// MOCK: In-app purchase and ads are fully simulated client-side (class project).

// Duration of a single mock ad in seconds. The MockAdOverlay counts down
// from this value before enabling the Close button.
export const MOCK_AD_DURATION_SECONDS = 5;

// Number of snooze credits earned by watching one mock ad.
export const CREDITS_PER_AD = 1;

// Plan values written to the Firestore `users/{uid}` document.
export const PREMIUM_PLAN_VALUE = 'PREMIUM';
export const FREE_PLAN_VALUE = 'FREE';

// Sleep cycle optimizer constants (in minutes).
export const SLEEP_CYCLE_MINUTES = 90;
export const FALL_ASLEEP_MINUTES = 15;

/**
 * Calculates the snooze credit cost for a given snooze count.
 * The 1st snooze costs 1 credit, the 2nd costs 2, and so on.
 *
 * @param {number} snoozeCount - Zero-based index of the current snooze
 *                               (0 for the first snooze, 1 for the second, etc.)
 * @returns {number} The number of credits required to snooze.
 */
export function snoozeCreditCost(snoozeCount) {
  return snoozeCount + 1;
}
