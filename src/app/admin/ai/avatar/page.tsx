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
    'avatar.enabled',
    'avatar.heygen.avatarId',
    'avatar.heygen.voiceId',
    'avatar.heygen.bgColor',
    'avatar.dailyCapPerVisitor'
  ]);

  const apiKeyConfigured = !!(cfg['integrations.heygen.apiKey'] || process.env.HEYGEN_API_KEY);

  return (
    <AvatarStudio
      apiKeyConfigured={apiKeyConfigured}
      initialConfig={{
        enabled: cfg['avatar.enabled'] === '1',
        avatarId: cfg['avatar.heygen.avatarId'] || '',
        voiceId: cfg['avatar.heygen.voiceId'] || '',
        bgColor: cfg['avatar.heygen.bgColor'] || '#FBEAF0',
        dailyCap: parseInt(cfg['avatar.dailyCapPerVisitor'] || '3', 10)
      }}
    />
  );
}
