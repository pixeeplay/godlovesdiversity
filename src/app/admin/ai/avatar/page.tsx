import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/settings';
import { AvatarStudio } from '@/components/admin/AvatarStudio';

export const dynamic = 'force-dynamic';

export default async function AvatarPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const cfg = await getSettings([
    'integrations.heygen.apiKey',
    'integrations.elevenlabs.apiKey',
    'integrations.liveavatar.apiKey',
    'avatar.enabled',
    'avatar.streaming.enabled',
    'avatar.streaming.avatarName',
    'avatar.local.enabled',
    'avatar.liveavatar.enabled',
    'avatar.liveavatar.avatarId',
    'avatar.liveavatar.maxDurationSec',
    'avatar.liveavatar.voice',
    'avatar.liveavatar.language',
    'avatar.heygen.avatarId',
    'avatar.heygen.voiceId',
    'avatar.heygen.bgColor',
    'avatar.dailyCapPerVisitor'
  ]);

  const apiKeyConfigured = !!(cfg['integrations.heygen.apiKey'] || process.env.HEYGEN_API_KEY);
  const hasElevenLabs = !!(cfg['integrations.elevenlabs.apiKey'] || process.env.ELEVENLABS_API_KEY);
  const hasLiveAvatar = !!(cfg['integrations.liveavatar.apiKey'] || process.env.LIVEAVATAR_API_KEY);

  return (
    <AvatarStudio
      apiKeyConfigured={apiKeyConfigured}
      hasElevenLabs={hasElevenLabs}
      hasLiveAvatar={hasLiveAvatar}
      initialConfig={{
        enabled: cfg['avatar.enabled'] === '1',
        streamingEnabled: cfg['avatar.streaming.enabled'] === '1',
        streamingAvatarName: cfg['avatar.streaming.avatarName'] || 'Susan_public_2_20240328',
        localLiveEnabled: cfg['avatar.local.enabled'] === '1',
        liveAvatarEnabled: cfg['avatar.liveavatar.enabled'] === '1',
        liveAvatarId: cfg['avatar.liveavatar.avatarId'] || '',
        liveAvatarMaxDur: parseInt(cfg['avatar.liveavatar.maxDurationSec'] || '120', 10),
        liveAvatarGeminiVoice: cfg['avatar.liveavatar.voice'] || 'Puck',
        liveAvatarLanguage: cfg['avatar.liveavatar.language'] || 'fr',
        avatarId: cfg['avatar.heygen.avatarId'] || '',
        voiceId: cfg['avatar.heygen.voiceId'] || '',
        bgColor: cfg['avatar.heygen.bgColor'] || '#FBEAF0',
        dailyCap: parseInt(cfg['avatar.dailyCapPerVisitor'] || '3', 10)
      }}
    />
  );
}
