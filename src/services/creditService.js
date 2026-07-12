// Credit system with dual storage.
//
// Authenticated users: snoozeCredits field on Firestore users/{uid}.
// Guests: snooze_credits key in the local SQLite app_meta key-value store.
//
// MOCK context: Ads that grant these credits are simulated client-side
// (see MockAdOverlay). There is no real AdMob SDK. Credits are a class
// project mechanic used to gate the snooze flow for free users; Premium
// users skip credits entirely.
import { doc, getDoc, increment, runTransaction, updateDoc } from 'firebase/firestore';

import { db } from '../config/firebase';
import { getMeta, setMeta } from '../database/appMetaRepository';

const GUEST_CREDITS_KEY = 'snooze_credits';

/**
 * Reads the snoozeCredits value stored on the user's Firestore document.
 *
 * @param {string} uid - The authenticated user's UID.
 * @returns {Promise<number>} The current credit balance (integer, default 0).
 */
export async function getAuthedCredits(uid) {
  if (!uid) return 0;
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return 0;
  const raw = snapshot.data()?.snoozeCredits;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Atomically increments the authenticated user's snoozeCredits by `amount`
 * using Firestore's increment() sentinel.
 *
 * @param {string} uid - The authenticated user's UID.
 * @param {number} amount - The number of credits to add (must be positive).
 * @returns {Promise<void>}
 */
export async function addAuthedCredits(uid, amount) {
  if (!uid) throw new Error('Missing user ID.');
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Credit amount must be a positive integer.');
  }
  await updateDoc(doc(db, 'users', uid), {
    snoozeCredits: increment(amount),
  });
}

/**
 * Atomically decrements the authenticated user's snoozeCredits by `amount`,
 * flooring the balance at 0. Uses a Firestore transaction so the read-modify-
 * write cycle is consistent even under concurrent writes.
 *
 * @param {string} uid - The authenticated user's UID.
 * @param {number} amount - The number of credits to spend (must be positive).
 * @returns {Promise<boolean>} `true` if the spend succeeded, `false` if the
 *   balance was insufficient (in which case no write is performed).
 */
export async function spendAuthedCredits(uid, amount) {
  if (!uid) throw new Error('Missing user ID.');
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Credit amount must be a positive integer.');
  }
  const userRef = doc(db, 'users', uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const raw = snapshot.exists() ? snapshot.data()?.snoozeCredits : 0;
    const current = Number.isInteger(Number(raw)) && Number(raw) > 0 ? Number(raw) : 0;
    if (current < amount) return false;
    transaction.update(userRef, { snoozeCredits: current - amount });
    return true;
  });
}

/**
 * Reads the guest credit balance from the local SQLite app_meta store.
 *
 * @returns {Promise<number>} The current credit balance (integer, default 0).
 */
export async function getGuestCredits() {
  const raw = await getMeta(GUEST_CREDITS_KEY);
  if (raw == null) return 0;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Writes the guest credit balance to the local SQLite app_meta store.
 * Negative values are floored at 0.
 *
 * @param {number} amount - The new credit balance.
 * @returns {Promise<void>}
 */
export async function setGuestCredits(amount) {
  const safe = Number.isInteger(amount) && amount > 0 ? amount : 0;
  await setMeta(GUEST_CREDITS_KEY, String(safe));
}

/**
 * Dispatcher: reads the current credit balance from the correct storage
 * backend based on whether the caller is authenticated.
 *
 * @param {object|null} user - The authenticated user object (must have `uid`),
 *   or `null` for a guest.
 * @returns {Promise<number>} The current credit balance (integer, default 0).
 */
export async function getCredits(user) {
  if (user && user.uid) return getAuthedCredits(user.uid);
  return getGuestCredits();
}

/**
 * Dispatcher: adds `amount` credits to the correct storage backend.
 *
 * @param {object|null} user - The authenticated user object, or `null` for guest.
 * @param {number} amount - The number of credits to add (must be positive).
 * @returns {Promise<void>}
 */
export async function addCredits(user, amount) {
  if (user && user.uid) return addAuthedCredits(user.uid, amount);
  const current = await getGuestCredits();
  await setGuestCredits(current + amount);
}

/**
 * Dispatcher: spends `amount` credits from the correct storage backend,
 * flooring the balance at 0.
 *
 * @param {object|null} user - The authenticated user object, or `null` for guest.
 * @param {number} amount - The number of credits to spend (must be positive).
 * @returns {Promise<boolean>} `true` if the spend succeeded, `false` if the
 *   balance was insufficient.
 */
export async function spendCredits(user, amount) {
  if (user && user.uid) return spendAuthedCredits(user.uid, amount);
  const current = await getGuestCredits();
  if (current < amount) return false;
  await setGuestCredits(current - amount);
  return true;
}
