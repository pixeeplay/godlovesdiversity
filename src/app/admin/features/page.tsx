import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FEATURE_DEFINITIONS, getAllFeatureFlags } from '@/lib/feature-flags';
import { FeatureFlagsClient } from '@/components/admin/FeatureFlagsClient';

export const dynamic = 'force-dynamic';

export default async function P() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const flags = await getAllFeatureFlags();
  return <FeatureFlagsClient initialFlags={flags} definitions={FEATURE_DEFINITIONS} />;
}
