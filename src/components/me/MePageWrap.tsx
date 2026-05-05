import Link from 'next/link';

export function MePageWrap({ title, count, emoji, children }: { title: string; count?: number; emoji?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-4">{emoji} {title}{count !== undefined && <span className="text-zinc-400 font-normal text-base ml-2">({count})</span>}</h1>
      {children}
    </div>
  );
}

export function MeEmpty({ icon: Icon, text, cta, href }: { icon: any; text: string; cta?: string; href?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
      <Icon size={32} className="mx-auto mb-2 opacity-30" />
      <p>{text}</p>
      {cta && href && <Link href={href} className="inline-block mt-3 bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full">{cta}</Link>}
    </div>
  );
}
