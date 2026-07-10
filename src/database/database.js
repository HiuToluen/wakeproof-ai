import * as SQLite from 'expo-sqlite';

let databasePromise;

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('wakeproof.db').catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}
