'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, Send, Loader2 } from 'lucide-react';

type Comment = { id: string; authorName: string; content: string; createdAt: string };

export function PhotoComments({ photoId }: { photoId: string }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/photos/${photoId}/comments`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [photoId]);

  async function submit() {
    if (!name.trim() || !content.trim()) return;
    setPosting(true);
    try {
      const r = await fetch(`/api/photos/${photoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: name, content })
      });
      if (r.ok) {
        const created = await r.json();
        setItems([created, ...items]);
        setContent('');
      } else {
        const j = await r.json();
        alert(j.error || 'Erreur');
      }
    } catch {
      alert('Erreur réseau');
    }
    setPosting(false);
  }

  return (
    <section className="mt-8">
      <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-white">
        <MessageCircle size={20} className="text-brand-pink" />
        Commentaires {items.length > 0 && <span className="text-white/50 text-sm">({items.length})</span>}
      </h3>

      {/* New comment */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 mb-4">
        <input
          className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          placeholder="Ton nom ou pseudo *"
          value={name} onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
        <textarea
          className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          rows={3}
          placeholder="Ton message bienveillant…"
          value={content} onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/40">{content.length}/1000</span>
          <button
            onClick={submit}
            disabled={posting || !name.trim() || !content.trim()}
            className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2"
          >
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Publier
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-white/50 text-sm italic">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-white/50 text-sm italic">Sois le premier à commenter cette photo. 🌈</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="font-bold text-brand-pink">{c.authorName}</span>
                <span className="text-xs text-white/40">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              <p className="text-white/85 text-sm whitespace-pre-line">{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
