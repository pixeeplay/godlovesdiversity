'use client';
import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Send, Loader2, Bold, Italic, List, Quote, Heading2, Lock } from 'lucide-react';

type Post = {
  id: string;
  content: string;
  createdAt: string;
  author?: { id: string; name: string | null; image: string | null } | null;
};

export function ForumThreadClient({ threadId, initialPosts, locked }: { threadId: string; initialPosts: Post[]; locked: boolean }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [sending, setSending] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[120px] focus:outline-none px-3 py-2'
      }
    }
  });

  async function send() {
    if (!editor || locked) return;
    const html = editor.getHTML();
    if (!html || html === '<p></p>') return;
    setSending(true);
    try {
      const r = await fetch(`/api/forum/threads/${threadId}/posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: html })
      });
      const j = await r.json();
      if (r.ok && j.post) {
        setPosts([...posts, { ...j.post, author: null }]);
        editor.commands.clearContent();
      } else {
        alert(`Erreur : ${j.error}`);
      }
    } finally { setSending(false); }
  }

  return (
    <div className="space-y-4">
      {/* Posts */}
      <div className="space-y-3">
        {posts.map((p) => (
          <article key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <header className="flex items-center gap-2 mb-3">
              {p.author?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.author.image} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold">
                  {p.author?.name?.[0]?.toUpperCase() || 'A'}
                </div>
              )}
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{p.author?.name || 'Anonyme'}</div>
                <div className="text-[10px] text-zinc-500">{new Date(p.createdAt).toLocaleString('fr-FR')}</div>
              </div>
            </header>
            <div
              className="prose prose-invert max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: p.content }}
            />
          </article>
        ))}
      </div>

      {/* Composer Tiptap */}
      {locked ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-200 text-sm flex items-center gap-2">
          <Lock size={16} /> Ce sujet est verrouillé. Tu ne peux plus y répondre.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="border-b border-zinc-800 px-2 py-1.5 flex items-center gap-1">
            <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor?.isActive('bold') ? 'bg-zinc-800 text-violet-400' : 'text-zinc-400'}`}><Bold size={14} /></button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor?.isActive('italic') ? 'bg-zinc-800 text-violet-400' : 'text-zinc-400'}`}><Italic size={14} /></button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor?.isActive('heading', { level: 2 }) ? 'bg-zinc-800 text-violet-400' : 'text-zinc-400'}`}><Heading2 size={14} /></button>
            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor?.isActive('bulletList') ? 'bg-zinc-800 text-violet-400' : 'text-zinc-400'}`}><List size={14} /></button>
            <button onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor?.isActive('blockquote') ? 'bg-zinc-800 text-violet-400' : 'text-zinc-400'}`}><Quote size={14} /></button>
            <span className="ml-auto text-[10px] text-zinc-500 pr-2">Ctrl+B / Ctrl+I…</span>
          </div>
          <EditorContent editor={editor} />
          <div className="border-t border-zinc-800 px-3 py-2 flex justify-end">
            <button
              onClick={send}
              disabled={sending}
              className="bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Répondre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
