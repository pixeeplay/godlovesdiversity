'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, Heart, Briefcase, Users, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MessagesPage() {
  const [convs, setConvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/connect/conversations').then(r => r.json()).then(j => {
      setConvs(j.conversations || []);
      setLoading(false);
    });
  }, []);

  const ICON: any = { match: Heart, connection: Briefcase, post: MessageCircle, direct: Users };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Messagerie</h1>
      <p className="text-sm text-zinc-400 mb-5">Toutes tes conversations — communauté, matches, pros — au même endroit.</p>

      {loading ? (
        <div className="text-center py-12 text-zinc-500"><Loader2 className="animate-spin mx-auto" /></div>
      ) : convs.length === 0 ? (
        <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-2xl p-8 text-center">
          <MessageCircle size={32} className="mx-auto mb-3 text-zinc-500" />
          <p className="text-zinc-400">Aucune conversation pour l'instant.</p>
          <p className="text-xs text-zinc-500 mt-1">Match quelqu'un en Rencontres ou connecte-toi à un pro pour démarrer.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {convs.map((c) => {
            const Icon = ICON[c.origin] || MessageCircle;
            return (
              <button key={c.id} onClick={() => router.push(`/connect/messages/${c.id}`)} className="w-full flex items-center gap-3 p-3 backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-2xl hover:bg-white/[0.08] transition text-left">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center font-bold text-sm flex-shrink-0">
                  {(c.other?.connectProfile?.displayName || c.other?.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">{c.other?.connectProfile?.displayName || c.other?.name || 'Membre'}</span>
                    <Icon size={11} className="text-zinc-500 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{c.lastMessage?.text || <em className="text-zinc-600">Aucun message</em>}</p>
                </div>
                {c.unread > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full grid place-items-center flex-shrink-0">{c.unread}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
