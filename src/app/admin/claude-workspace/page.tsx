import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ClaudeWorkspaceClient } from '@/components/admin/ClaudeWorkspaceClient';
import { getSecret } from '@/lib/secrets';

export const dynamic = 'force-dynamic';
export const metadata = { title: '🤖 Claude Workspace · GLD Admin' };

export default async function ClaudeWorkspacePage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/claude-workspace');
  if ((s.user as any)?.role !== 'ADMIN') redirect('/admin');

  const codeServerUrl = (await getSecret('CODE_SERVER_URL')) || '';
  const telegramConfigured = !!(await getSecret('TELEGRAM_BOT_TOKEN'));

  return <ClaudeWorkspaceClient codeServerUrl={codeServerUrl} telegramConfigured={telegramConfigured} />;
}
