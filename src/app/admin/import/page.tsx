import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BulkImporter } from '@/components/admin/BulkImporter';

export default async function ImportPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-display font-bold mb-2">Import en masse</h1>
      <p className="text-zinc-400 mb-8">
        Glisse un dossier ou plusieurs photos. Les coordonnées GPS sont extraites
        automatiquement (EXIF) et le lieu est identifié via OpenStreetMap.
      </p>
      <BulkImporter />
    </div>
  );
}
