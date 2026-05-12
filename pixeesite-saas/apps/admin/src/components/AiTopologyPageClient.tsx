'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage } from './SimpleOrgPage';
import { AiTopologyMap } from './AiTopologyMap';

/**
 * Page dédiée à la visualisation Topology (2D + 3D Brain) — full-bleed.
 */
export function AiTopologyPageClient({ orgSlug }: { orgSlug: string }) {
  const [providers, setProviders] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/ai-providers`).then((r) => r.json()).then((j) => {
      setProviders(j.providers || []);
      setMappings(j.mappings || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, [orgSlug]);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🗺️" title="AI Topology"
      desc="Visualise live les flux entre features IA et providers — 2D Sankey, Constellation, Brain 3D, Stats."
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : (
        <AiTopologyMap orgSlug={orgSlug} providers={providers} mappings={mappings} />
      )}
    </SimpleOrgPage>
  );
}
