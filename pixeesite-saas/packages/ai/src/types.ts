export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'imagen' | 'elevenlabs' | 'fal' | 'heygen';

export type AiOperation = 'text' | 'image' | 'video' | 'audio' | 'embed' | 'parallax-bg' | 'parallax-mid' | 'parallax-fg';

export interface AiCallContext {
  orgId: string;
  userId?: string;
  ip?: string;
}

export interface AiCallResult {
  success: boolean;
  durationMs: number;
  promptTokens?: number;
  outputTokens?: number;
  imagesCount?: number;
  audioSeconds?: number;
  videoSeconds?: number;
  costCents?: number;
  errorMessage?: string;
}
