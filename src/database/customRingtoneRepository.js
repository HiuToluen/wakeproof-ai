import { getDatabase } from './database';

function mapRingtone(row) {
  return row ? { id: row.id, name: row.name, fileUri: row.file_uri, mimeType: row.mime_type, createdAt: row.created_at, updatedAt: row.updated_at } : null;
}

export async function getCustomRingtones() {
  const database = await getDatabase();
  return (await database.getAllAsync('SELECT * FROM custom_ringtones ORDER BY created_at DESC')).map(mapRingtone);
}

export async function getCustomRingtoneById(id) {
  const database = await getDatabase();
  return mapRingtone(await database.getFirstAsync('SELECT * FROM custom_ringtones WHERE id = ?', [id]));
}

export async function createCustomRingtone(ringtone) {
  const database = await getDatabase();
  await database.runAsync('INSERT INTO custom_ringtones (id, name, file_uri, mime_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [ringtone.id, ringtone.name, ringtone.fileUri, ringtone.mimeType ?? null, ringtone.createdAt, ringtone.updatedAt ?? null]);
  return getCustomRingtoneById(ringtone.id);
}

export async function renameCustomRingtone(id, name) {
  const database = await getDatabase();
  await database.runAsync('UPDATE custom_ringtones SET name = ?, updated_at = ? WHERE id = ?', [name, new Date().toISOString(), id]);
  return getCustomRingtoneById(id);
}

export async function deleteCustomRingtoneMetadata(id) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM custom_ringtones WHERE id = ?', [id]);
}

export async function countAlarmsUsingRingtone(id) {
  const database = await getDatabase();
  const row = await database.getFirstAsync('SELECT COUNT(*) AS count FROM alarms WHERE ringtone_id = ?', [id]);
  return row?.count ?? 0;
}
