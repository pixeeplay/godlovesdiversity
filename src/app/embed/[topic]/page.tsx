import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function P({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  let items: any[] = [];
  try {
    if (topic === 'testimonies') {
      items = await prisma.videoTestimony.findMany({ where: { status: 'approved' as any }, take: 6, orderBy: { createdAt: 'desc' } });
    } else if (topic === 'venues') {
      items = await prisma.venue.findMany({ where: { published: true, featured: true }, take: 6 });
    } else if (topic === 'events') {
      items = await prisma.event.findMany({ where: { published: true, startsAt: { gte: new Date() } }, take: 6, orderBy: { startsAt: 'asc' } });
    }
  } catch {}

  return (
    <html><body style={{ margin: 0, fontFamily: 'system-ui', background: 'transparent', color: '#fff' }}>
      <div style={{ padding: 12, background: 'linear-gradient(135deg,#1a0a2a,#0a0a14)', borderRadius: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, color: '#d61b80', marginBottom: 8 }}>
          ✨ parislgbt · {topic}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
          {items.map((it: any, i: number) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 8, fontSize: 12 }}>
              <div style={{ fontWeight: 'bold' }}>{it.title || it.name}</div>
              {it.transcription && <div style={{ opacity: 0.7, marginTop: 4, fontSize: 10 }}>{it.transcription.slice(0, 80)}…</div>}
            </div>
          ))}
        </div>
        <Link href="/" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 10, color: '#d61b80' }}>Voir plus sur gld.pixeeplay.com →</Link>
      </div>
    </body></html>
  );
}
