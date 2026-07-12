import { getDatabase } from './database';

/**
 * Reads a value from the app_meta key-value store.
 *
 * @param {string} key - The primary key to look up.
 * @returns {Promise<string|null>} The stored value, or null if the key does not exist.
 */
export async function getMeta(key) {
  try {
    const database = await getDatabase();
    const row = await database.getFirstAsync('SELECT value FROM app_meta WHERE key = ?', [key]);
    return row ? row.value : null;
  } catch (error) {
    throw new Error(`Unable to read app_meta: ${error.message}`);
  }
}

/**
 * Upserts a value into the app_meta key-value store.
 *
 * @param {string} key - The primary key to write.
 * @param {string} value - The value to persist (must be a string).
 * @returns {Promise<void>}
 */
export async function setMeta(key, value) {
  try {
    const database = await getDatabase();
    await database.runAsync(
      'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    );
  } catch (error) {
    throw new Error(`Unable to write app_meta: ${error.message}`);
  }
}
