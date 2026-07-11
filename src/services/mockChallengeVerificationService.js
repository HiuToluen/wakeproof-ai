import { MOCK_VERIFICATION_MODES } from '../constants/challengeConstants';

let mode = MOCK_VERIFICATION_MODES.AUTO;

export function setMockVerificationMode(nextMode) {
  if (Object.values(MOCK_VERIFICATION_MODES).includes(nextMode)) mode = nextMode;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function verifyChallenge({ challenge }) {
  await delay(1000 + Math.floor(Math.random() * 1000));
  if (mode === MOCK_VERIFICATION_MODES.ALWAYS_ERROR) throw new Error('Mock verification service is unavailable.');
  if (mode === MOCK_VERIFICATION_MODES.ALWAYS_PASS) return { isValid: true, confidence: 0.94, reason: 'Mock verification accepted the proof.', detectedObjects: [challenge.targetKey] };
  if (mode === MOCK_VERIFICATION_MODES.ALWAYS_FAIL) return { isValid: false, confidence: 0.38, reason: `Could not confidently verify ${challenge.title.toLowerCase()}.`, detectedObjects: [] };
  if (Math.random() < 0.08) throw new Error('Mock verification timed out.');
  const isValid = Math.random() < 0.78;
  return { isValid, confidence: isValid ? 0.86 : 0.42, reason: isValid ? 'Mock verification accepted the proof.' : `Could not confidently verify ${challenge.title.toLowerCase()}.`, detectedObjects: isValid ? [challenge.targetKey] : [] };
}
