import Link from 'next/link';

export const metadata = { title: 'Session mentor — GLD' };

/**
 * Session vidéo via Jitsi Meet (100% gratuit, sans compte, sans API key).
 * URL : /mentor/session/{room-name}
 */
export default async function P({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const cleanRoom = `gld-mentor-${room.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 32)}`;

  return (
    <main className="container-wide py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-bold text-lg">🎥 Session mentor · {cleanRoom}</h1>
        <Link href="/mentor" className="text-fuchsia-400 hover:underline text-sm">← Retour</Link>
      </div>
      <iframe
        src={`https://meet.jit.si/${cleanRoom}`}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        className="w-full rounded-2xl border border-zinc-800"
        style={{ height: '70vh' }}
      />
      <div className="mt-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300">
        <strong className="text-fuchsia-400">💡 Cette salle</strong> est privée et 100% chiffrée bout-en-bout (Jitsi Meet, hébergé en Europe).
        Partage le lien <code className="bg-zinc-950 px-1 rounded text-[10px]">{`https://gld.pixeeplay.com/mentor/session/${room}`}</code> avec ton·ta mentor·e/mentee.
        Aucun compte requis.
      </div>
    </main>
  );
}
