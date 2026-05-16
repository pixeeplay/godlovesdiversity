/**
 * Catalogue des clés secrets connues, utilisé par les UIs Secrets.
 * Permet d'afficher des suggestions et catégoriser proprement.
 */

export const PLATFORM_KEYS_CATALOG = [
  // Billing
  { key: 'STRIPE_SECRET_KEY', category: 'billing', description: 'Clé secrète Stripe (sk_live_… ou sk_test_…)' },
  { key: 'STRIPE_PUBLISHABLE_KEY', category: 'billing', description: 'Clé publique Stripe (pk_…)' },
  { key: 'STRIPE_WEBHOOK_SECRET', category: 'billing', description: 'Whsec_… pour vérifier les webhooks' },
  { key: 'STRIPE_PRICE_SOLO', category: 'billing', description: 'price_… pour le plan Solo' },
  { key: 'STRIPE_PRICE_PRO', category: 'billing', description: 'price_… pour le plan Pro' },
  { key: 'STRIPE_PRICE_AGENCY', category: 'billing', description: 'price_… pour le plan Agency' },

  // OAuth
  { key: 'GOOGLE_CLIENT_ID', category: 'oauth', description: 'Google OAuth client ID' },
  { key: 'GOOGLE_CLIENT_SECRET', category: 'oauth', description: 'Google OAuth client secret' },
  { key: 'GITHUB_CLIENT_ID', category: 'oauth', description: 'GitHub OAuth client ID (optionnel)' },
  { key: 'GITHUB_CLIENT_SECRET', category: 'oauth', description: 'GitHub OAuth client secret' },

  // Mail
  { key: 'RESEND_API_KEY', category: 'mail', description: 'Resend API key (re_…) pour mails plateforme' },
  { key: 'RESEND_FROM', category: 'mail', description: 'Adresse "From" par défaut (no-reply@pixeesite.com)' },

  // Infra
  { key: 'COOLIFY_API_TOKEN', category: 'infra', description: 'Token Coolify pour automation déploiement' },
  { key: 'COOLIFY_URL', category: 'infra', description: 'URL Coolify (http://51.75.31.123:8000)' },
  { key: 'CADDY_ADMIN_URL', category: 'infra', description: 'URL admin Caddy (provisioning custom domains)' },
  { key: 'CADDY_ADMIN_TOKEN', category: 'infra', description: 'Bearer token Caddy admin' },
  { key: 'GITHUB_TOKEN', category: 'infra', description: 'GitHub PAT pour push automation' },
  { key: 'MASTER_KEY', category: 'infra', description: 'Master key encryption secrets (32 bytes hex)' },
  { key: 'MINIO_ROOT_USER', category: 'infra', description: 'MinIO admin user (storage tenants)' },
  { key: 'MINIO_ROOT_PASSWORD', category: 'infra', description: 'MinIO admin password' },

  // Media library partagée (free tiers, fallback plateforme si l'org n'a pas configuré)
  { key: 'UNSPLASH_ACCESS_KEY', category: 'media', description: 'Unsplash (Client-ID, 50 req/h gratuit)' },
  { key: 'PEXELS_API_KEY', category: 'media', description: 'Pexels photos + vidéos (gratuit)' },
  { key: 'PIXABAY_KEY', category: 'media', description: 'Pixabay photos + vidéos (gratuit)' },
  { key: 'GIPHY_KEY', category: 'media', description: 'Giphy GIFs (gratuit)' },
  { key: 'YOUTUBE_API_KEY', category: 'media', description: 'YouTube Data API v3 (search vidéos)' },
];

export const ORG_KEYS_CATALOG = [
  // AI text/image/video
  { key: 'GEMINI_API_KEY', category: 'ai', description: 'Google Gemini (text + multimodal)' },
  { key: 'OPENAI_API_KEY', category: 'ai', description: 'OpenAI (GPT-4, GPT-5, DALL-E)' },
  { key: 'ANTHROPIC_API_KEY', category: 'ai', description: 'Anthropic Claude (Opus/Sonnet/Haiku)' },
  { key: 'OPENROUTER_API_KEY', category: 'ai', description: 'OpenRouter (accès 200+ modèles)' },
  { key: 'GROQ_API_KEY', category: 'ai', description: 'Groq (inference ultra-rapide Llama/Mixtral)' },
  { key: 'OLLAMA_URL', category: 'ai', description: 'http://host:11434 (Ollama local/Tailscale)' },
  { key: 'LM_STUDIO_URL', category: 'ai', description: 'http://host:1234/v1 (LM Studio compatible OpenAI)' },
  { key: 'PERPLEXITY_API_KEY', category: 'ai', description: 'Perplexity (search + LLM)' },
  { key: 'MISTRAL_API_KEY', category: 'ai', description: 'Mistral AI (Le Chat)' },

  // Media
  { key: 'FAL_API_KEY', category: 'media', description: 'fal.ai (image/video gen, FLUX, Seedance)' },
  { key: 'IMAGEN_API_KEY', category: 'media', description: 'Google Imagen 3 (via Vertex)' },
  { key: 'ELEVENLABS_API_KEY', category: 'media', description: 'ElevenLabs (TTS, voice clone)' },
  { key: 'HEYGEN_API_KEY', category: 'media', description: 'HeyGen (avatars vidéo)' },
  { key: 'RUNWAY_API_KEY', category: 'media', description: 'Runway ML (Gen-3, Gen-4)' },
  { key: 'REPLICATE_API_TOKEN', category: 'media', description: 'Replicate (modèles open-source)' },

  // Media library (free tiers, peuvent aussi être platform-level)
  { key: 'UNSPLASH_ACCESS_KEY', category: 'media', description: 'Unsplash photos (Client-ID, 50 req/h gratuit)' },
  { key: 'PEXELS_API_KEY', category: 'media', description: 'Pexels photos + vidéos (gratuit)' },
  { key: 'PIXABAY_KEY', category: 'media', description: 'Pixabay photos + vidéos (gratuit)' },
  { key: 'GIPHY_KEY', category: 'media', description: 'Giphy GIFs (gratuit)' },
  { key: 'YOUTUBE_API_KEY', category: 'media', description: 'YouTube Data API v3 (search vidéos)' },

  // Mail / Communication
  { key: 'RESEND_API_KEY', category: 'mail', description: 'Resend API key (mails du tenant)' },
  { key: 'TELEGRAM_BOT_TOKEN', category: 'mail', description: 'Telegram bot pour notifs' },
  { key: 'TELEGRAM_CHAT_ID', category: 'mail', description: 'Telegram chat ID destination' },
  { key: 'TWILIO_ACCOUNT_SID', category: 'mail', description: 'Twilio SID (SMS)' },
  { key: 'TWILIO_AUTH_TOKEN', category: 'mail', description: 'Twilio auth token' },
  { key: 'TWILIO_PHONE_NUMBER', category: 'mail', description: 'Numéro Twilio expéditeur' },

  // Storage
  { key: 'S3_ENDPOINT', category: 'storage', description: 'Endpoint S3 (MinIO/R2/AWS)' },
  { key: 'S3_REGION', category: 'storage', description: 'Région S3' },
  { key: 'S3_ACCESS_KEY', category: 'storage', description: 'Access key S3' },
  { key: 'S3_SECRET_KEY', category: 'storage', description: 'Secret key S3' },
  { key: 'S3_BUCKET', category: 'storage', description: 'Bucket name (ex: tenant-arnaud)' },

  // Stripe Connect (le client a son propre Stripe)
  { key: 'STRIPE_CONNECT_ACCOUNT_ID', category: 'billing', description: 'acct_… (compte Stripe du client pour boutique)' },

  // Maps / Analytics
  { key: 'GOOGLE_MAPS_API_KEY', category: 'analytics', description: 'Google Maps (geocoding, places)' },
  { key: 'MAPBOX_TOKEN', category: 'analytics', description: 'Mapbox public token' },
  { key: 'GA_MEASUREMENT_ID', category: 'analytics', description: 'Google Analytics 4 (G-XXXXX)' },
  { key: 'PLAUSIBLE_DOMAIN', category: 'analytics', description: 'Domaine Plausible' },
  { key: 'POSTHOG_API_KEY', category: 'analytics', description: 'PostHog (analytics + replays)' },
  { key: 'MICROSOFT_CLARITY_ID', category: 'analytics', description: 'Microsoft Clarity heatmaps + session replay (ID public)' },
  { key: 'HOTJAR_ID', category: 'analytics', description: 'Hotjar heatmaps + replay (ID numérique public)' },
];

export const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
  billing:   { emoji: '💳', label: 'Facturation / Stripe' },
  oauth:     { emoji: '🔑', label: 'OAuth providers' },
  mail:      { emoji: '✉️', label: 'Mail / Communication' },
  infra:     { emoji: '🛠️', label: 'Infrastructure' },
  ai:        { emoji: '🤖', label: 'IA (LLMs)' },
  media:     { emoji: '🎨', label: 'Image / Vidéo / Audio' },
  storage:   { emoji: '💾', label: 'Stockage' },
  analytics: { emoji: '📊', label: 'Analytics / Maps' },
  general:   { emoji: '⚙️', label: 'Général' },
};
