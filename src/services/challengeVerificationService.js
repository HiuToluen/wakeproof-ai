import { verifyChallenge as verifyGeminiChallenge } from './geminiChallengeVerificationService';
import { verifyChallenge as verifyMockChallenge } from './mockChallengeVerificationService';
import { getAssignedChallenge } from './challengeService';

async function getCurrentChallenge(sessionId, challenge) {
  if (!sessionId || String(sessionId).startsWith('preview:')) return challenge;
  return await getAssignedChallenge(sessionId) ?? challenge;
}

export async function verifyChallenge({ sessionId, challenge, image }) {
  const currentChallenge = await getCurrentChallenge(sessionId, challenge);
  if (process.env.EXPO_PUBLIC_USE_MOCK_AI === 'true') {
    return verifyMockChallenge({ sessionId, challenge: currentChallenge, image });
  }
  return verifyGeminiChallenge({ sessionId, challenge: currentChallenge, image });
}
