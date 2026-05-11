import { FeaturePage } from '@/components/FeaturePage';

export default async function VsCodeOnlinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = `pixeeplay/${slug}-pixeesite`;
  return (
    <FeaturePage
      orgSlug={slug} emoji="💻" title="VS Code online" desc="Édite ton code Pixeesite directement dans le navigateur"
      intro={
        <div style={{ fontSize: 13 }}>
          <strong>Repo cible :</strong> <code style={{ background: '#0a0a0f', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{repo}</code>
          {' · '}<strong>Branche :</strong> <code style={{ background: '#0a0a0f', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>main</code>
          <div style={{ marginTop: 6, opacity: 0.7 }}>Choisis ton IDE en ligne préféré ci-dessous. Tous ouvrent dans un nouvel onglet et te connectent directement sur ce repo.</div>
        </div>
      }
      cards={[
        { title: 'github.dev', icon: '🐙', borderColor: '#3b82f6', accentColor: '#3b82f6',
          description: 'VS Code in the browser — read & basic edit, sans terminal. Gratuit, instant.',
          bullets: [
            { label: '+ AVANTAGES', items: ['Pas d\'install', 'GitHub login auto', 'Syntax + git diff', 'Le plus rapide pour des edits ponctuels'] },
            { label: '– LIMITES', items: ['Pas de terminal', 'Pas de npm install'] },
          ],
          cta: { label: 'Ouvrir github.dev', href: `https://github.dev/${repo}` },
        },
        { title: 'vscode.dev', icon: '⚛️', borderColor: '#06b6d4', accentColor: '#06b6d4',
          description: 'Microsoft VS Code Web — variant officielle, browser-based.',
          bullets: [
            { label: '+ AVANTAGES', items: ['Extensions', 'Settings sync', 'Source control', 'Pour des sessions longues sur ton repo GitHub'] },
            { label: '– LIMITES', items: ['Pas de terminal', 'Limité côté backend'] },
          ],
          cta: { label: 'Ouvrir vscode.dev', href: `https://vscode.dev/github/${repo}` },
        },
        { title: 'GitHub Codespaces', icon: '☁️', borderColor: '#10b981', accentColor: '#10b981',
          description: 'Conteneur cloud complet avec VS Code + terminal + Node + DB. 60h gratuites/mois.',
          bullets: [
            { label: '+ AVANTAGES', items: ['Terminal complet', 'npm/pnpm install', 'docker', 'preview ports', 'Le plus puissant — comme un Mac dans le cloud'] },
            { label: '– LIMITES', items: ['~$0.18/h après les 60h gratuites', 'Setup ~30s'] },
          ],
          cta: { label: 'Ouvrir Codespaces', href: `https://codespaces.new/${repo}` },
        },
        { title: 'StackBlitz', icon: '⚡', borderColor: '#8b5cf6', accentColor: '#8b5cf6',
          description: 'WebContainers — Node.js qui tourne directement dans le navigateur. Hot reload instant.',
          bullets: [
            { label: '+ AVANTAGES', items: ['Démarrage 3s', 'Preview live', 'Pas besoin de container', 'Pour expérimenter sans rien installer'] },
            { label: '– LIMITES', items: ['Limité aux Node-pure', 'Pas de Postgres réel'] },
          ],
          cta: { label: 'Ouvrir StackBlitz', href: `https://stackblitz.com/github/${repo}` },
        },
        { title: 'Gitpod', icon: '🟠', borderColor: '#f59e0b', accentColor: '#f59e0b',
          description: 'Workspace cloud — alternative à Codespaces avec 50h gratuites/mois.',
          bullets: [
            { label: '+ AVANTAGES', items: ['Terminal complet', '50h gratuites', 'Snapshots', 'Alternative open-source à Codespaces'] },
            { label: '– LIMITES', items: ['Setup à configurer (.gitpod.yml)'] },
          ],
          cta: { label: 'Ouvrir Gitpod', href: `https://gitpod.io/#https://github.com/${repo}` },
        },
        { title: 'code-server self-hosted', icon: '🟣', borderColor: '#8b5cf6', accentColor: '#8b5cf6',
          badge: 'VIA TAILSCALE',
          description: 'VS Code installé sur ton serveur, accessible via Tailscale depuis ton navigateur. Le plus puissant : terminal complet, exécution dans ton env local.',
          cta: { label: 'Setup self-hosted', href: 'https://github.com/coder/code-server' },
        },
      ]}
    />
  );
}
