import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * GET /api/avatar/voice-settings
 * Renvoie les paramètres voix divine (publics, lecture seule).
 * Utilisé par DivineLightAvatar côté front.
 */
export async function GET() {
  const keys = [
    'avatar.voice.preset',
    'avatar.voice.lang',
    'avatar.voice.voiceName',
    'avatar.voice.rate',
    'avatar.voice.pitch',
    'avatar.voice.volume',
    'avatar.voice.reverb',
    'avatar.voice.octaveShift'
  ];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } }).catch(() => []);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  // Defaults selon le preset (ou "god" par défaut)
  const preset = map['avatar.voice.preset'] || 'god';
  const presetDefaults: Record<string, any> = {
    god:     { rate: 0.75, pitch: 0.55, volume: 1, reverb: 70, octaveShift: -3 },
    angel:   { rate: 0.95, pitch: 1.4,  volume: 1, reverb: 50, octaveShift:  3 },
    prophet: { rate: 0.7,  pitch: 0.85, volume: 1, reverb: 30, octaveShift: -1 },
    normal:  { rate: 1,    pitch: 1,    volume: 1, reverb:  0, octaveShift:  0 }
  };
  const def = presetDefaults[preset] || presetDefaults.god;

  return NextResponse.json({
    preset,
    lang: map['avatar.voice.lang'] || 'fr-FR',
    voiceName: map['avatar.voice.voiceName'] || '',
    rate:        parseFloat(map['avatar.voice.rate'] || '') || def.rate,
    pitch:       parseFloat(map['avatar.voice.pitch'] || '') || def.pitch,
    volume:      parseFloat(map['avatar.voice.volume'] || '') || def.volume,
    reverb:      parseFloat(map['avatar.voice.reverb'] || '') || def.reverb,
    octaveShift: parseFloat(map['avatar.voice.octaveShift'] || '0') || def.octaveShift
  });
}
