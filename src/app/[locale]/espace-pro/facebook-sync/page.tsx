import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function RedirectToProImport() {
  redirect('/admin/pro/import-events');
}
