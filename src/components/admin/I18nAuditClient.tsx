'use client';
import { useEffect, useState } from 'react';
import { Languages, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Sparkles, Globe } from 'lucide-react';

const LOCALE_FLAG: Record<string, string> = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', pt: '🇵🇹' };

type AuditEntity = {
  model: string;
  key: string;
  id: string;
  presentLocales: string[];
  missingLocales: string[];
};

type AuditReport = {
  generatedAt: string;
  totalIssues: number;
  byModel: Record<string, { totalEntities: number; entitiesWithMissing: number; missingTotal: number }>;
  entities: AuditEntity[];
};

export function I18nAuditClient() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { void run(); }, []);

  async function run() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/i18n/audit');
      const j = await r.json();
      if (r.ok) setReport(j);
      else alert(j.error || 'Erreur audit');
    } finally {
      setLoading(false);
    }
  }

  async function translate(entity: AuditEntity) {
    setTranslating(entity.id);
    try {
      const r = await fetch('/api/admin/i18n/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: entity.model,
          sourceId: entity.id,
          targetLocales: entity.missingLocales
        })
      });
      const j = await r.json();
      if (r.ok) {
        const okCount = j.results?.filter((x: any) => x.ok).length || 0;
        alert(`✓ ${okCount}/${j.results?.length || 0} traductions générées par Gemini`);
        await run();
      } else {
        alert(j.error || 'Erreur');
      }
    } finally {
      setTranslating(null);
    }
  }

  const models = Object.keys(report?.byModel || {});
  const filteredEntities = report?.entities.filter((e) => filter === 'all' || e.model === filter) || [];

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-2.5">
              <Languages size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold">Traductions GLD</h1>
            <span className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
              Audit IA
            </span>
          </div>
          <p className="text-zinc-400 text-sm max-w-3xl">
            Détecte automatiquement les contenus qui ne sont pas traduits dans toutes les langues du site (FR / EN / ES / PT) et propose une traduction Gemini en un clic.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Relancer l'audit
        </button>
      </header>

      {report && (
        <>
          {/* TUILE TOTAL */}
          <div className={`rounded-2xl p-5 border-2 ${report.totalIssues === 0 ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-amber-500/5 border-amber-500/40'}`}>
            <div className="flex items-center gap-3">
              {report.totalIssues === 0 ? (
                <CheckCircle2 size={32} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={32} className="text-amber-400" />
              )}
              <div>
                <div className="text-2xl font-bold">
                  {report.totalIssues === 0
                    ? 'Tout est traduit ✨'
                    : `${report.totalIssues} traduction${report.totalIssues > 1 ? 's' : ''} manquante${report.totalIssues > 1 ? 's' : ''}`}
                </div>
                <div className="text-xs text-zinc-400">Audit généré : {new Date(report.generatedAt).toLocaleString('fr-FR')}</div>
              </div>
            </div>
          </div>

          {/* STATS PAR MODÈLE */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(report.byModel).map(([model, st]) => (
              <button
                key={model}
                onClick={() => setFilter(filter === model ? 'all' : model)}
                className={`text-left rounded-xl p-3 border transition ${filter === model ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
              >
                <div className="text-[10px] uppercase font-bold text-zinc-500">{model}</div>
                <div className="text-2xl font-bold text-white">{st.totalEntities}</div>
                <div className="text-[10px] text-zinc-400">
                  {st.entitiesWithMissing > 0
                    ? <span className="text-amber-300">{st.entitiesWithMissing} incomplet{st.entitiesWithMissing > 1 ? 's' : ''}</span>
                    : <span className="text-emerald-300">Tout OK</span>}
                </div>
              </button>
            ))}
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="rounded-xl p-3 border border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs">
                ← Tous
              </button>
            )}
          </div>

          {/* LISTE ENTITÉS INCOMPLÈTES */}
          {filteredEntities.length === 0 ? (
            <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-8 text-center">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
              <div className="text-emerald-200 font-bold">Aucune traduction manquante {filter !== 'all' && `sur ${filter}`}.</div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Modèle</th>
                    <th className="text-left px-4 py-3">Clé</th>
                    <th className="text-left px-4 py-3">Présent</th>
                    <th className="text-left px-4 py-3">Manquant</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntities.map((e) => (
                    <tr key={e.id} className="border-t border-zinc-800 hover:bg-zinc-950/40">
                      <td className="px-4 py-3 text-zinc-400 text-xs">{e.model}</td>
                      <td className="px-4 py-3 font-mono text-xs text-white truncate max-w-[280px]" title={e.key}>{e.key}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {e.presentLocales.map((l) => (
                            <span key={l} className="text-base" title={l}>{LOCALE_FLAG[l] || l}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-50">
                          {e.missingLocales.map((l) => (
                            <span key={l} className="text-base grayscale" title={`${l} manquant`}>{LOCALE_FLAG[l] || l}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => translate(e)}
                          disabled={translating === e.id}
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
                        >
                          {translating === e.id
                            ? <><Loader2 size={11} className="animate-spin" /> Traduction…</>
                            : <><Sparkles size={11} /> Traduire avec Gemini</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="text-[10px] text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
        <strong className="text-zinc-300">Comment ça marche :</strong><br />
        Le scan compare, pour chaque entité (Page, Article, Banner, MenuItem, PageSection), les locales présentes vs les 4 supportées (fr, en, es, pt).
        En cliquant « Traduire avec Gemini », GLD prend le row source et appelle l'API Gemini pour générer les versions manquantes, puis les enregistre en base.
        Tu peux relancer l'audit à tout moment ou planifier une vérification automatique via Tâches programmées.
      </div>
    </div>
  );
}
