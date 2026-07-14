import { GoogleGenAI, Type } from '@google/genai';
import { File } from 'expo-file-system';

import { CHALLENGE_TYPES } from '../constants/challengeConstants';

export const GEMINI_VERIFICATION_MODEL = 'gemini-2.5-flash';
export const GEMINI_REQUEST_TIMEOUT_MS = 15000;
export const MIN_VERIFICATION_CONFIDENCE = 0.75;

const ERROR_MESSAGES = {
  MISSING_API_KEY: 'AI verification is not configured.',
  VERIFICATION_TIMEOUT: 'Verification took too long. Please try again.',
  NETWORK_ERROR: 'Unable to reach the AI service. Check your connection and try again.',
  RATE_LIMITED: 'AI verification is temporarily busy. Please try again shortly.',
  INVALID_AI_RESPONSE: 'The AI returned an invalid verification result. Please try again.',
  AI_SERVICE_ERROR: 'Unable to verify the photo right now. Please try again.',
};

let client;

export function createVerificationError(code, cause) {
  const error = new Error(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.AI_SERVICE_ERROR);
  error.code = code;
  error.cause = cause;
  return error;
}

function getGeminiClient() {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw createVerificationError('MISSING_API_KEY');
  if (!client) {
    // Direct mobile API key usage is acceptable only for this MVP/demo; production should move AI calls behind a backend.
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function getMimeType(image) {
  const uri = image?.uri ?? '';
  const type = image?.mimeType ?? image?.type;
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp') return type;
  if (/\.png($|[?#])/i.test(uri)) return 'image/png';
  if (/\.webp($|[?#])/i.test(uri)) return 'image/webp';
  return 'image/jpeg';
}

async function imageToInlineData(image) {
  if (!image?.uri) throw createVerificationError('INVALID_AI_RESPONSE');
  const file = new File(image.uri);
  const data = await file.base64();
  return { data, mimeType: getMimeType(image) };
}

function buildPrompt(challenge) {
  const fields = [
    `Challenge id: ${challenge.id}`,
    `Challenge type: ${challenge.type}`,
    `Target key: ${challenge.targetKey}`,
    `Title: ${challenge.title}`,
    `Instruction: ${challenge.instruction}`,
  ].join('\n');
  const common = 'Return only the requested JSON. Evaluate only visible evidence in the image. Reject unrelated, severely blurry, dark, obstructed, or ambiguous images. Do not perform face recognition, identity verification, or identify who a person is.';
  if (challenge.type === CHALLENGE_TYPES.LOCATION_PROOF) {
    return `${fields}\n\nVerify whether the requested environment, location, or context is clearly recognizable. Do not rely only on text or assumptions. For self/location challenges, require all explicitly requested elements. If the challenge is self_in_front_of_mirror, require both a visible person and visible mirror context. If the challenge is self_near_study_desk, require both a visible person and a study desk or clearly recognizable study area.\n\n${common}`;
  }
  return `${fields}\n\nVerify whether the required object is clearly visible. Do not infer hidden or partially absent objects. For ordinary object challenges, require the target object to be clearly recognizable.\n\n${common}`;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
    reason: { type: Type.STRING },
    detectedObjects: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['isValid', 'confidence', 'reason', 'detectedObjects'],
};

function parseResponse(response) {
  const text = response?.text;
  if (typeof text !== 'string' || text.trim().length === 0) throw createVerificationError('INVALID_AI_RESPONSE');
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw createVerificationError('INVALID_AI_RESPONSE', error);
  }
}

function normalizeResult(rawResult) {
  if (typeof rawResult?.isValid !== 'boolean') throw createVerificationError('INVALID_AI_RESPONSE');
  if (!Number.isFinite(rawResult.confidence) || rawResult.confidence < 0 || rawResult.confidence > 1) throw createVerificationError('INVALID_AI_RESPONSE');
  if (typeof rawResult.reason !== 'string' || rawResult.reason.trim().length === 0) throw createVerificationError('INVALID_AI_RESPONSE');
  if (!Array.isArray(rawResult.detectedObjects) || rawResult.detectedObjects.some((item) => typeof item !== 'string')) throw createVerificationError('INVALID_AI_RESPONSE');
  const accepted = rawResult.isValid === true && rawResult.confidence >= MIN_VERIFICATION_CONFIDENCE;
  return {
    isValid: accepted,
    confidence: rawResult.confidence,
    reason: rawResult.reason.trim(),
    detectedObjects: rawResult.detectedObjects,
  };
}

function mapGeminiError(error) {
  if (error?.code && ERROR_MESSAGES[error.code]) return error;
  const status = error?.status ?? error?.response?.status;
  const message = String(error?.message ?? '').toLowerCase();
  if (status === 429 || message.includes('429') || message.includes('rate limit')) return createVerificationError('RATE_LIMITED', error);
  if (message.includes('network') || message.includes('fetch') || message.includes('offline')) return createVerificationError('NETWORK_ERROR', error);
  return createVerificationError('AI_SERVICE_ERROR', error);
}

function withTimeout(promise) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(createVerificationError('VERIFICATION_TIMEOUT')), GEMINI_REQUEST_TIMEOUT_MS);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function logVerification(message, details = {}) {
  if (__DEV__) console.log(`[gemini-verification] ${message}`, details);
}

export async function verifyChallenge({ challenge, image, technicalRetryNumber = 0 }) {
  const startedAt = Date.now();
  logVerification('request started', { model: GEMINI_VERIFICATION_MODEL, imageWidth: image?.width, imageHeight: image?.height, approximateFileSize: image?.approximateFileSize, technicalRetryNumber });
  try {
    const inlineData = await imageToInlineData(image);
    const response = await withTimeout(getGeminiClient().models.generateContent({
      model: GEMINI_VERIFICATION_MODEL,
      contents: [{
        role: 'user',
        parts: [
          { inlineData },
          { text: buildPrompt(challenge) },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    }));
    const result = normalizeResult(parseResponse(response));
    logVerification('request completed', { durationMs: Date.now() - startedAt, technicalRetryNumber });
    return result;
  } catch (error) {
    const mappedError = mapGeminiError(error);
    logVerification('request failed', { durationMs: Date.now() - startedAt, technicalRetryNumber, errorCode: mappedError.code });
    throw mappedError;
  }
}
