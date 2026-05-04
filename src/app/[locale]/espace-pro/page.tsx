import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Espace Pro — God Loves Diversity' };

/**
 * /espace-pro est désormais en back-office sous /admin/pro.
 * On redirige pour préserver les anciens liens externes.
 */
export default function EspaceProRedirect() {
  redirect('/admin/pro');
}
