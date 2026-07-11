import { CHALLENGE_ATTEMPT_STATUS } from '../constants/challengeConstants';
import { getDatabase } from './database';

function mapAttempt(row) {
  return row ? { id: row.id, sessionId: row.session_id, challengeId: row.challenge_id, imageUri: row.image_uri, verificationStatus: row.verification_status, isValid: row.is_valid == null ? null : Boolean(row.is_valid), confidence: row.confidence, reason: row.reason, attemptedAt: row.attempted_at } : null;
}

export async function createChallengeAttempt(attempt) {
  const database = await getDatabase();
  const id = attempt.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const attemptedAt = attempt.attemptedAt ?? new Date().toISOString();
  await database.runAsync('INSERT INTO challenge_attempts (id, session_id, challenge_id, image_uri, verification_status, attempted_at) VALUES (?, ?, ?, ?, ?, ?)', [id, attempt.sessionId, attempt.challengeId, attempt.imageUri ?? null, CHALLENGE_ATTEMPT_STATUS.PENDING, attemptedAt]);
  return mapAttempt(await database.getFirstAsync('SELECT * FROM challenge_attempts WHERE id = ?', [id]));
}

export async function updateChallengeAttemptResult(id, result) {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    const existing = await database.getFirstAsync('SELECT session_id, verification_status FROM challenge_attempts WHERE id = ?', [id]);
    await database.runAsync('UPDATE challenge_attempts SET verification_status = ?, is_valid = ?, confidence = ?, reason = ? WHERE id = ?', [result.verificationStatus, result.isValid == null ? null : result.isValid ? 1 : 0, result.confidence ?? null, result.reason ?? null, id]);
    if (existing?.verification_status === CHALLENGE_ATTEMPT_STATUS.PENDING && result.verificationStatus === CHALLENGE_ATTEMPT_STATUS.FAILED) {
      await database.runAsync('UPDATE alarm_sessions SET challenge_attempt_count = challenge_attempt_count + 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), existing.session_id]);
    }
  });
  return mapAttempt(await database.getFirstAsync('SELECT * FROM challenge_attempts WHERE id = ?', [id]));
}

export async function getAttemptsBySessionId(sessionId) {
  const database = await getDatabase();
  return (await database.getAllAsync('SELECT * FROM challenge_attempts WHERE session_id = ? ORDER BY attempted_at DESC', [sessionId])).map(mapAttempt);
}

export async function getAttemptCountForSession(sessionId) {
  const database = await getDatabase();
  const row = await database.getFirstAsync('SELECT COUNT(*) AS count FROM challenge_attempts WHERE session_id = ?', [sessionId]);
  return row?.count ?? 0;
}
