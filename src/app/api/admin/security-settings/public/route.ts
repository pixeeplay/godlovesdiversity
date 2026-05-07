import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/security-settings/public
 * Renvoie UNIQUEMENT les flags publics (méthodes de login activées)
 * pour que la page /admin/login puisse adapter son UI sans login.
 */
export async function GET() {
  const cfg = await getSettings([
    'security.allowSignup',
    'security.allowMagicLink',
    'security.allowGoogle',
    'security.allowApple',
    'security.allowInvitation',
    'security.emailVerificationRequired'
  ]).catch(() => ({} as Record<string, string>));

  return NextResponse.json({
    allowSignup:                cfg['security.allowSignup'] !== 'false',
    allowMagicLink:             cfg['security.allowMagicLink'] !== 'false',
    allowGoogle:                cfg['security.allowGoogle'] === 'true',
    allowApple:                 cfg['security.allowApple'] === 'true',
    allowInvitation:            cfg['security.allowInvitation'] !== 'false',
    emailVerificationRequired:  cfg['security.emailVerificationRequired'] !== 'false'
  });
}
