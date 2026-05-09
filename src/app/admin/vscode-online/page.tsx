import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { VSCodeOnlineClient } from '@/components/admin/VSCodeOnlineClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '💻 VS Code online · GLD Admin' };

export default async function VSCodeOnlinePage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/vscode-online');
  if ((s.user as any)?.role !== 'ADMIN') redirect('/admin');

  // Repo GitHub auto-détecté depuis env (ou default)
  const repo = process.env.GITHUB_REPO_FULL_NAME || 'pixeeplay/godlovesdiversity';
  const branch = process.env.GITHUB_DEFAULT_BRANCH || 'main';
  const codeServerUrl = process.env.CODE_SERVER_URL || '';   // ex: http://100.64.x.x:8443 (Tailscale)

  return <VSCodeOnlineClient repo={repo} branch={branch} codeServerUrl={codeServerUrl} />;
}
