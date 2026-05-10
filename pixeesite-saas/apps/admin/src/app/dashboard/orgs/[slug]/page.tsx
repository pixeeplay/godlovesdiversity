import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { platformDb } from '@pixeesite/database';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { OrgSitesClient } from '@/components/OrgSitesClient';

export const dynamic = 'force-dynamic';

export default async function OrgDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const { slug } = await params;
  const userId = (session.user as any).id;

  // Vérif membership
  const membership = await platformDb.orgMember.findFirst({
    where: { userId, org: { slug } },
    select: { role: true, org: { select: { id: true, slug: true, name: true, plan: true, planStatus: true, trialEndsAt: true, defaultDomain: true, tenantDbReady: true, maxSites: true, usedAiCredits: true, maxAiCredits: true } } },
  });
  if (!membership) notFound();
  const org = membership.org;

  // Liste les sites
  const sites = await platformDb.site.findMany({
    where: { orgId: org.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, slug: true, name: true, status: true, pageCount: true, deployStatus: true, deployedAt: true, updatedAt: true },
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0, marginBottom: 4 }}>{org.name}</h1>
          <p style={{ opacity: 0.6, fontSize: 14, margin: 0 }}>
            <code style={{ background: '#27272a', padding: '2px 6px', borderRadius: 4 }}>{org.slug}.pixeesite.app</code>
            <span style={{ marginLeft: 12, opacity: 0.5 }}>· {org.plan.toUpperCase()}</span>
            {org.planStatus === 'trial' && org.trialEndsAt && (
              <span style={{ marginLeft: 8, color: '#fbbf24' }}>· Trial jusqu'au {new Date(org.trialEndsAt).toLocaleDateString('fr-FR')}</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/dashboard/orgs/${slug}/templates`} style={{ background: 'linear-gradient(135deg, #d946ef, #06b6d4)', color: 'white', padding: '10px 16px', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
            ✨ Nouveau site
          </Link>
        </div>
      </div>

      {/* DB provisioning warning */}
      {!org.tenantDbReady && (
        <div style={{ background: '#fbbf2415', border: '1px solid #fbbf2440', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          ⏳ La base de données de ton organisation est en cours de provisioning. Patiente 30 secondes puis recharge la page.
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
        <Stat label="Sites" value={`${sites.length} / ${org.maxSites === 999 ? '∞' : org.maxSites}`} icon="📁" />
        <Stat label="Crédits IA utilisés" value={`${org.usedAiCredits} / ${org.maxAiCredits}`} icon="✨" />
        <Stat label="Plan" value={org.plan.toUpperCase()} icon="💎" />
        <Stat label="Rôle" value={membership.role} icon="🔑" />
      </div>

      {/* Sites */}
      <OrgSitesClient orgSlug={slug} initialSites={sites as any} canCreateMore={sites.length < org.maxSites} />
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: 12, opacity: 0.5, textTransform: 'uppercase', marginTop: 8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
