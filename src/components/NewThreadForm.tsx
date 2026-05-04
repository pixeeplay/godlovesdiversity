'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Loader2, Send, Bold, Italic, List, Quote, Heading2 } from 'lucide-react';

export function NewThreadForm({ categories, preselected }: { categories: any[]; preselected?: string }) {
  const router = useRouter();
  const initial = categories.find((c) => c.slug === preselected) || categories[0];
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string>(initial?.id || '');
  const [sending, setSending] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'prose prose-invert max-w-none min-h-[180px] focus:outline-none px-3 py-2' }
    }
  });

  async function submit() {
    if (!title.trim() || !categoryId || !editor) return;
    const html = editor.getHTML();
    if (!html || html === '<p></p>') { alert('Écris le contenu de ton sujet'); return; }
    setSending(true);
    try {
      const r = await fetch('/api/forum/threads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: html, categoryId })
      });
      const j = await r.json();
      if (r.ok && j.thread) {
        router.push(`/forum/sujet/${j.thread.slug}`);
      } else {
        alert(`Erreur : ${j.error}`);
      }
    } finally { setSending(false); }
  }

  return (
    <div className="space-y-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre du sujet *"
        maxLength={120}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-base outline-none focus:border-violet-500"
      />
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500"
      >
        <option value="">— Catégorie —</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-800 px-2 py-1.5 flex items-center gap-1">
          <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor?.isActive('bold') ? 'bg-zinc-800 text-violet-400' : 'text-zinc-400'}`}><Bold size={14} /></button>
          <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor?.isActive('italic') ? 'bg-zinc-800 text-violet-400' : 'text-zinc-400'}`}><Italic size={14} /></button>
          <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor?.isActive('heading', { level: 2 }) ? 'bg-zinc-800 text-violet-400' : 'text-zinc-400'}`}><Heading2 size={14} /></button>
          <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor?.isActive('bulletList') ? 'bg-zinc-800 text-violet-400' : 'text-zinc-400'}`}><List size={14} /></button>
          <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={`p-1.5 rounded hover:bg-zinc-800 ${editor?.isActive('blockquote') ? 'bg-zinc-800 text-violet-400' : 'text-zinc-400'}`}><Quote size={14} /></button>
        </div>
        <EditorContent editor={editor} />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={submit} disabled={sending || !title.trim() || !categoryId} className="bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publier le sujet
        </button>
      </div>
    </div>
  );
}
