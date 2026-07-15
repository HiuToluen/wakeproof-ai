import { ALARM_SESSION_STATUS, CHALLENGE_MODES } from '../constants/alarmConstants';
import { CHALLENGE_FLOW_MODES, CHALLENGE_TIMEOUT_SECONDS, CHALLENGE_TYPES, MAX_CHALLENGE_REROLLS } from '../constants/challengeConstants';
import { CHALLENGE_CATALOG, DEMO_OBJECT_CHALLENGES } from '../data/challengeCatalog';
import { getAlarmById } from '../database/alarmRepository';
import { assignSessionChallenge, getAlarmSessionById, rerollSessionChallenge } from '../database/alarmSessionRepository';

export function getActiveChallenges() {
  const activeChallenges = [];

  for (const challenge of DEMO_OBJECT_CHALLENGES) {
    if (challenge.isActive) activeChallenges.push(challenge);
  }

  for (const challenge of CHALLENGE_CATALOG) {
    if (challenge.isActive && challenge.type === CHALLENGE_TYPES.LOCATION_PROOF) activeChallenges.push(challenge);
  }

  return activeChallenges;
}

function getChallengesForMode(mode) {
  const activeChallenges = getActiveChallenges();
  if (mode === CHALLENGE_MODES.RANDOM) return activeChallenges;
  return activeChallenges.filter((challenge) => challenge.type === mode);
}

function pickRandom(challenges) {
  return challenges[Math.floor(Math.random() * challenges.length)];
}

export function selectChallengeRerollCandidate(alternatives, history = [], excludedChallengeId) {
  const historySet = new Set(history);
  const unseen = alternatives.filter((challenge) => !historySet.has(challenge.id));
  const selected = pickRandom(unseen.length > 0 ? unseen : alternatives);
  const nextHistory = historySet.has(excludedChallengeId) ? history : [...history, excludedChallengeId];

  return { selected, nextHistory };
}

export function selectRandomChallenge(options = {}) {
  const challenges = getChallengesForMode(options.mode ?? CHALLENGE_MODES.RANDOM);
  if (challenges.length === 0) throw new Error('No active challenges are available.');
  return pickRandom(challenges);
}

export async function getAssignedChallenge(sessionId) {
  const session = await getAlarmSessionById(sessionId);
  if (!session?.challengeId) return null;
  const definition = getActiveChallenges().find((challenge) => challenge.id === session.challengeId) ?? CHALLENGE_CATALOG.find((challenge) => challenge.id === session.challengeId);
  if (!definition) return null;
  return { ...definition, startedAt: session.challengeStartedAt, deadlineAt: session.challengeDeadlineAt, rerollCount: session.challengeRerollCount ?? 0, remainingRerolls: Math.max(0, MAX_CHALLENGE_REROLLS - (session.challengeRerollCount ?? 0)), challengeHistory: session.challengeHistory ?? [] };
}

export async function getChallengeRerollState(sessionId) {
  const session = await getAlarmSessionById(sessionId);
  if (!session) throw new Error('Alarm session could not be loaded.');
  return { rerollCount: session.challengeRerollCount ?? 0, remainingRerolls: Math.max(0, MAX_CHALLENGE_REROLLS - (session.challengeRerollCount ?? 0)), challengeHistory: session.challengeHistory ?? [] };
}

export async function rerollChallengeForSession(sessionId) {
  const session = await getAlarmSessionById(sessionId);
  if (!session) throw new Error('Alarm session could not be loaded.');
  if (session.status !== ALARM_SESSION_STATUS.CHALLENGE_ACTIVE) throw new Error('Challenge is no longer active.');
  if (session.challengeFlowMode !== CHALLENGE_FLOW_MODES.AI) throw new Error('Challenge reroll is unavailable in offline emergency mode.');
  if (!session.challengeDeadlineAt || new Date(session.challengeDeadlineAt).getTime() <= Date.now()) throw new Error('Challenge deadline has expired.');
  if ((session.challengeRerollCount ?? 0) >= MAX_CHALLENGE_REROLLS) throw new Error('No rerolls remaining.');
  if (!session.challengeId) throw new Error('No challenge is currently assigned.');
  const alarm = await getAlarmById(session.alarmId);
  const validPool = getChallengesForMode(alarm?.challengeMode ?? CHALLENGE_MODES.RANDOM);
  const alternatives = validPool.filter((challenge) => challenge.id !== session.challengeId);
  if (alternatives.length === 0) throw new Error('No alternative challenge is available for this alarm.');
  const { selected, nextHistory } = selectChallengeRerollCandidate(alternatives, session.challengeHistory ?? [], session.challengeId);
  const updatedSession = await rerollSessionChallenge(sessionId, selected, nextHistory);
  if (updatedSession.status !== ALARM_SESSION_STATUS.CHALLENGE_ACTIVE || updatedSession.challengeId !== selected.id) throw new Error('Challenge reroll could not be applied.');
  return { ...selected, startedAt: updatedSession.challengeStartedAt, deadlineAt: updatedSession.challengeDeadlineAt, rerollCount: updatedSession.challengeRerollCount, remainingRerolls: Math.max(0, MAX_CHALLENGE_REROLLS - updatedSession.challengeRerollCount), challengeHistory: updatedSession.challengeHistory };
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
  return { ...challenge, startedAt, deadlineAt, rerollCount: 0, remainingRerolls: MAX_CHALLENGE_REROLLS, challengeHistory: [] };
}
