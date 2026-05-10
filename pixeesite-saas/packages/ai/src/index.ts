/**
 * @pixeesite/ai — Wrappers IA centralisés.
 *
 * Chaque appel passe par trackUsage() qui logge dans AiUsage de la
 * platform DB pour facturation / quotas.
 */
export { generateText } from './gemini-text';
export { generateImage, generateParallaxLayer } from './imagen';
export { generateVideoPrompt, generateVideo } from './video';
export { synthesizeVoice } from './elevenlabs';
export { trackAiUsage } from './tracking';
export type { AiOperation, AiProvider } from './types';
