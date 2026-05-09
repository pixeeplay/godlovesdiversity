import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ClaudeCliClient } from '@/components/admin/ClaudeCliClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '🤖 Claude CLI online · GLD Admin' };

export default async function ClaudeCliPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/claude-cli');
  if ((s.user as any)?.role !== 'ADMIN') redirect('/admin');

  // On expose si une clé est configurée (pas la clé elle-même)
  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN);
  const authMethod = process.env.CLAUDE_CODE_OAUTH_TOKEN
    ? 'oauth-max'
    : process.env.ANTHROPIC_API_KEY ? 'api-key' : 'none';

  return <ClaudeCliClient hasApiKey={hasApiKey} authMethod={authMethod} />;
}
