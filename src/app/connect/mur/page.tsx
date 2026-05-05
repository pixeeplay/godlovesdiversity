'use client';
import { useState, useEffect } from 'react';
import { Heart, Sparkles, MessageCircle, Share2, Image as ImageIcon, Calendar, Smile, MoreHorizontal, ShieldCheck, Loader2 } from 'lucide-react';
import { MOCK_POSTS, MOCK_USERS, getUser } from '@/lib/connect-mock';

export default function MurPage() {
  const [posts, setPosts] = useState<any[]>(MOCK_POSTS);
  const [composer, setComposer] = useState('');
  const [composerType, setComposerType] = useState<'post' | 'photo' | 'event' | 'sentiment' | 'priere'>('post');
  const [posting, setPosting] = useState(false);
  const [showMock, setShowMock] = useState(true);

  // Charge les vrais posts depuis l'API + check si mock activé
  useEffect(() => {
    Promise.all([
      fetch('/api/connect/posts').then(r => r.ok ? r.json() : { posts: [] }).catch(() => ({ posts: [] })),
      fetch('/api/admin/settings').then(r => r.ok ? r.json() : { settings: {} }).catch(() => ({ settings: {} }))
    ]).then(([postsR, settingsR]) => {
      const realPosts = postsR.posts || [];
      const mockEnabled = settingsR.settings?.['connect.showMockData'] !== 'false';
      setShowMock(mockEnabled);
      // Mix : vrais posts (toujours en haut) + mock (si activé)
      if (realPosts.length > 0 && mockEnabled) setPosts([...realPosts, ...MOCK_POSTS]);
      else if (realPosts.length > 0) setPosts(realPosts);
      else if (!mockEnabled) setPosts([]);
      else setPosts(MOCK_POSTS);
    });
  }, []);

  async function publish() {
    if (!composer.trim() || posting) return;
    setPosting(true);
    try {
      const r = await fetch('/api/connect/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: composerType, text: composer })
      });
      let j: any = {};
      try { j = await r.json(); } catch {}
      if (r.status === 401) {
        if (confirm('Tu dois être connecté pour publier. Aller à la page de connexion ?')) {
          window.location.href = '/admin/login?next=/connect/mur';
        }
        return;
      }
      if (!r.ok || !j.ok) {
        alert(`❌ Publication impossible : ${j.error || `HTTP ${r.status}`}\n\nSi le souci persiste, va dans /admin/connect.`);
        return;
      }
      setPosts([j.post, ...posts]);
      setComposer('');
      setComposerType('post');
    } catch (e: any) {
      alert('❌ Erreur réseau : ' + (e?.message || e));
    } finally { setPosting(false); }
  }

  return (
    <div className="grid lg:grid-cols-[220px_1fr_240px] gap-5">
      {/* Sidebar gauche — glass avec liens fonctionnels */}
      <aside className="hidden lg:block">
        <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-2xl p-3 sticky top-32">
          <SidebarLink active href="/connect/mur" label="Mon mur" emoji="🏠" />
          <SidebarLink href="/cercles-priere" label="Cercles de prière" emoji="🕊" count={4} />
          <SidebarLink href="/connect/amis" label="Mes amis" emoji="👥" count={47} />
          <SidebarLink href="/connect/groupes" label="Groupes" emoji="✨" count={12} />
          <SidebarLink href="/agenda" label="Événements" emoji="📅" count={3} />
          <SidebarLink href="/temoignages" label="Témoignages" emoji="💖" />
          <SidebarLink href="/galerie" label="Photos partagées" emoji="🖼" />
          <SidebarLink href="/connect/messages" label="Messagerie" emoji="💬" />
          <SidebarLink href="/connect/onboard" label="Mon profil Connect" emoji="⚙️" />
          <div className="border-t border-white/10 mt-3 pt-3 text-[10px] text-zinc-500 px-2">
            Mode <b className="text-fuchsia-300">Communauté</b><br/>
            Ton mur, tes posts, tes amis
          </div>
        </div>
      </aside>

      {/* Feed central */}
      <div className="space-y-4">
        {/* Composer glass */}
        <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/10 rounded-2xl p-4 shadow-xl shadow-fuchsia-500/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center text-sm font-bold flex-shrink-0">A</div>
            <div className="flex-1">
              <textarea
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Partage un témoignage, une prière, une photo, un événement…"
                rows={2}
                className="w-full bg-transparent outline-none resize-none text-sm placeholder:text-zinc-500"
              />
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <ChipBtn icon={ImageIcon} label="Photo"               color="from-emerald-400 to-cyan-500"   active={composerType === 'photo'}     onClick={() => setComposerType(composerType === 'photo' ? 'post' : 'photo')} />
                <ChipBtn icon={Calendar}  label="Événement"           color="from-orange-400 to-red-500"     active={composerType === 'event'}     onClick={() => setComposerType(composerType === 'event' ? 'post' : 'event')} />
                <ChipBtn icon={Smile}     label="Sentiment"           color="from-yellow-400 to-pink-500"    active={composerType === 'sentiment'} onClick={() => setComposerType(composerType === 'sentiment' ? 'post' : 'sentiment')} />
                <ChipBtn icon={Sparkles}  label="Demande de prière"   color="from-fuchsia-500 to-violet-600" active={composerType === 'priere'}    onClick={() => setComposerType(composerType === 'priere' ? 'post' : 'priere')} />
                <button onClick={publish} disabled={!composer.trim() || posting} className="ml-auto text-xs font-bold text-white bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2 rounded-full shadow-lg shadow-fuchsia-500/30 disabled:opacity-50 flex items-center gap-1.5">
                  {posting && <Loader2 size={12} className="animate-spin" />} Publier
                </button>
              </div>
              {composerType !== 'post' && (
                <div className="mt-2 text-[10px] text-zinc-400">Type sélectionné : <b className="text-fuchsia-300">{composerType}</b> — re-clique sur le chip pour annuler</div>
              )}
            </div>
          </div>
        </div>

        {/* Posts */}
        {posts.map((p) => <PostCard key={p.id} post={p} />)}

        <div className="text-center text-[11px] text-zinc-500 py-4 border border-dashed border-white/10 rounded-2xl">
          ✨ MVP démo — contenu mock effaçable depuis <code className="text-fuchsia-300">/admin/connect</code>
        </div>
      </div>

      {/* Sidebar droite — glass */}
      <aside className="hidden lg:block space-y-4">
        <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-2xl p-3 sticky top-32">
          <h3 className="text-xs font-bold text-zinc-300 mb-2 px-1">Anniversaires</h3>
          <a href="/agenda" className="block text-xs text-zinc-400 mb-3 px-1 hover:text-white">🎂 Sarah · 28 ans aujourd'hui</a>
          <h3 className="text-xs font-bold text-zinc-300 mb-2 px-1">Événements proches</h3>
          <a href="/agenda" className="block text-xs text-zinc-400 mb-1 px-1 hover:text-white">🌈 Pride Lyon — 14 juin</a>
          <a href="/agenda" className="block text-xs text-zinc-400 mb-3 px-1 hover:text-white">🕯 Veillée œcuménique — 22 juin</a>
          <h3 className="text-xs font-bold text-zinc-300 mb-2 px-1">Suggestions</h3>
          {MOCK_USERS.slice(0, 3).map((u) => <SuggestionRow key={u.id} u={u} />)}
        </div>
      </aside>
    </div>
  );
}

function SuggestionRow({ u }: { u: any }) {
  const [done, setDone] = useState(false);
  async function add() {
    await fetch('/api/connect/connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: u.id, message: `Salut ${u.name} 👋` })
    }).catch(() => null);
    setDone(true);
  }
  return (
    <div className="flex items-center gap-2 px-1 py-1.5">
      <div className="w-7 h-7 rounded-full" style={{ background: `linear-gradient(135deg, ${u.avatarColor[0]}, ${u.avatarColor[1]})` }} />
      <div className="text-[11px] flex-1 truncate">
        <div className="font-bold text-zinc-200 truncate">{u.name}</div>
        <div className="text-zinc-500 text-[10px] truncate">{u.identity} · {u.city}</div>
      </div>
      <button onClick={add} disabled={done} className={`text-[10px] px-2 py-1 rounded-full ${done ? 'bg-emerald-500/20 text-emerald-200' : 'bg-fuchsia-500/20 text-fuchsia-200 hover:bg-fuchsia-500/30'}`}>
        {done ? '✓' : '+'}
      </button>
    </div>
  );
}

function SidebarLink({ label, emoji, count, active, href }: { label: string; emoji: string; count?: number; active?: boolean; href?: string }) {
  return (
    <a href={href || '#'} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition ${active ? 'bg-white/[0.08] text-white font-bold' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}>
      <span className="text-base">{emoji}</span>
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>}
    </a>
  );
}

function ChipBtn({ icon: Icon, label, color, active, onClick }: { icon: any; label: string; color: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full text-white shadow-lg transition ${
      active ? `bg-gradient-to-r ${color} ring-2 ring-white/40 scale-105` : `bg-gradient-to-r ${color} opacity-70 hover:opacity-100`
    }`}>
      <Icon size={11} /> {label} {active && '✓'}
    </button>
  );
}

function PostCard({ post }: { post: any }) {
  const [liked, setLiked] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const author = getUser(post.authorHandle);
  if (!author) return null;

  const typeBadge: Record<string, { label: string; color: string }> = {
    temoignage: { label: '💖 Témoignage',         color: 'from-pink-500/20 to-rose-500/20 text-pink-200 border-pink-400/30' },
    priere:     { label: '🕊 Demande de prière',  color: 'from-violet-500/20 to-fuchsia-500/20 text-violet-200 border-violet-400/30' },
    event:      { label: '📅 Événement',          color: 'from-orange-500/20 to-red-500/20 text-orange-200 border-orange-400/30' },
    photo:      { label: '🖼 Photo',              color: 'from-emerald-500/20 to-cyan-500/20 text-emerald-200 border-emerald-400/30' },
    post:       { label: '✨ Post',               color: 'from-zinc-500/20 to-zinc-700/20 text-zinc-300 border-zinc-400/20' }
  };
  const tb = typeBadge[post.type] || typeBadge.post;
  const ago = relTime(post.createdAt);

  return (
    <article className="backdrop-blur-2xl bg-white/[0.05] border border-white/10 rounded-2xl p-4 shadow-xl shadow-black/20 hover:bg-white/[0.07] transition-all">
      <header className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: `linear-gradient(135deg, ${author.avatarColor[0]}, ${author.avatarColor[1]})` }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">{author.name}</span>
            {author.verified && <ShieldCheck size={12} className="text-emerald-400" />}
            <span className="text-[11px] text-zinc-500">·</span>
            <span className="text-[11px] text-zinc-400">{author.tradition}</span>
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {author.city} · {ago}{post.circle && ` · Cercle ${post.circle}`}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-gradient-to-r ${tb.color} border`}>{tb.label}</span>
        <button className="text-zinc-500 hover:text-white"><MoreHorizontal size={16} /></button>
      </header>

      <p className="text-sm text-zinc-100 leading-relaxed mb-3 whitespace-pre-wrap">{post.text}</p>

      {post.imageGradient && (
        <div className="rounded-xl mb-3 h-48 grid place-items-center text-zinc-300 text-xs" style={{ background: `linear-gradient(135deg, ${post.imageGradient[0]}, ${post.imageGradient[1]})` }}>
          [ Photo / Vidéo ]
        </div>
      )}

      <footer className="flex items-center gap-1 pt-3 border-t border-white/10">
        <button onClick={() => setLiked(!liked)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${liked ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-400 hover:bg-white/5'}`}>
          <Heart size={13} fill={liked ? 'currentColor' : 'none'} /> {post.likes + (liked ? 1 : 0)}
        </button>
        <button onClick={() => setPrayed(!prayed)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${prayed ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-400 hover:bg-white/5'}`}>
          <Sparkles size={13} /> {post.prayers + (prayed ? 1 : 0)} <span className="hidden sm:inline">je prie</span>
        </button>
        <button onClick={() => alert('Commentaires bientôt — pour l\'instant utilise Demande de prière')} className="flex items-center gap-1.5 text-zinc-400 hover:bg-white/5 px-3 py-1.5 rounded-full text-xs font-bold">
          <MessageCircle size={13} /> {post.comments}
        </button>
        <button onClick={() => {
          const url = `${location.origin}/connect/mur#post-${post.id}`;
          if ((navigator as any).share) (navigator as any).share({ title: 'GLD Connect', text: post.text.slice(0, 100), url }).catch(() => {});
          else { navigator.clipboard.writeText(url); alert('Lien copié !'); }
        }} className="ml-auto text-zinc-400 hover:bg-white/5 p-1.5 rounded-full" title="Partager">
          <Share2 size={13} />
        </button>
        <button onClick={async () => {
          const reason = prompt('Raison du signalement ? (harassment / hate / spam / explicit / other)');
          if (!reason) return;
          await fetch('/api/connect/report', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportedId: post.authorId, contentType: 'post', contentId: post.id, reason })
          }).catch(() => null);
          alert('✓ Signalement envoyé à l\'équipe modération');
        }} className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-full" title="Signaler">
          <MoreHorizontal size={13} />
        </button>
      </footer>
    </article>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return 'à l\'instant';
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}
