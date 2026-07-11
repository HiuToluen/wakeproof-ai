import { CHALLENGE_MODES } from '../constants/alarmConstants';
import { CHALLENGE_TIMEOUT_SECONDS } from '../constants/challengeConstants';
import { CHALLENGE_CATALOG } from '../data/challengeCatalog';
import { getAlarmById } from '../database/alarmRepository';
import { assignSessionChallenge, getAlarmSessionById } from '../database/alarmSessionRepository';

export function getActiveChallenges() {
  return CHALLENGE_CATALOG.filter((challenge) => challenge.isActive);
}

export function selectRandomChallenge(options = {}) {
  const mode = options.mode ?? CHALLENGE_MODES.RANDOM;
  const challenges = getActiveChallenges().filter((challenge) => mode === CHALLENGE_MODES.RANDOM || challenge.type === mode);
  if (challenges.length === 0) throw new Error('No active challenges are available.');
  return challenges[Math.floor(Math.random() * challenges.length)];
}

export async function getAssignedChallenge(sessionId) {
  const session = await getAlarmSessionById(sessionId);
  if (!session?.challengeId) return null;
  const definition = CHALLENGE_CATALOG.find((challenge) => challenge.id === session.challengeId);
  if (!definition) return null;
  return { ...definition, startedAt: session.challengeStartedAt, deadlineAt: session.challengeDeadlineAt };
}

export async function assignChallengeToSession(sessionId) {
  const existing = await getAssignedChallenge(sessionId);
  if (existing) return existing;
  const session = await getAlarmSessionById(sessionId);
  if (!session) throw new Error('Alarm session could not be loaded.');
  const alarm = await getAlarmById(session.alarmId);
  const challenge = selectRandomChallenge({ mode: alarm?.challengeMode ?? CHALLENGE_MODES.RANDOM });
  const startedAt = new Date().toISOString();
  const deadlineAt = new Date(Date.now() + CHALLENGE_TIMEOUT_SECONDS * 1000).toISOString();
  await assignSessionChallenge(sessionId, challenge, startedAt, deadlineAt);
  return { ...challenge, startedAt, deadlineAt };
}
