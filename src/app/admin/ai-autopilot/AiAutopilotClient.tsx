'use client';
import { useEffect, useState } from 'react';
import { Sparkles, Heart, ShieldAlert, Mail, Activity, Loader2, Save, Play, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const KEYS = {
  moodEnabled: 'ai.mood.enabled',
  moodAffectsTheme: 'ai.mood.affectsTheme',
  moodAffectsMusic: 'ai.mood.affectsMusic',
  moodCurrent: 'ai.mood.current',
  moodLastRunAt: 'ai.mood.lastRunAt',
  modEnabled: 'ai.moderation.enabled',
  modAutoHide: 'ai.moderation.autoHide',
  modThreshold: 'ai.moderation.threshold',
  modNotifyAdmin: 'ai.moderation.notifyAdmin',
  modLastRunAt: 'ai.moderation.lastRunAt',
  nlEnabled: 'ai.newsletter.enabled',
  nlAutoSend: 'ai.newsletter.autoSend',
  nlDayOfWeek: 'ai.newsletter.dayOfWeek',
  nlHour: 'ai.newsletter.hour',
  nlTone: 'ai.newsletter.tone',
  nlLastRunAt: 'ai.newsletter.lastRunAt',
  quotaDailyMax: 'ai.quota.dailyMax',
  quotaUsedToday: 'ai.quota.usedToday'
};

export function AiAutopilotClient() {
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [running, setRunning] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ feature: string; ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/ai/autopilot').then((r) => r.json());
    setCfg(r.config || {});
    setStats(r.stats || {});
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function set(k: string, v: any) {
    setCfg((c) => ({ ...c, [k]: typeof v === 'boolean' ? (v ? '1' : '0') : String(v) }));
  }
  const isOn = (k: string) => cfg[k] === '1' || cfg[k] === 'true';

  async function save() {
    setBusy(true);
    await fetch('/api/admin/ai/autopilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    setBusy(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(0), 2500);
  }

  async function runNow(feature:  'newsletter') {
    setRunning(feature);
    setRunResult(null);
    const r = await fetch(`/api/admin/ai/${feature}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json();
    setRunning(null);
    setRunResult({ feature, ok: !!j.ok, msg: j.ok ? (j.subject || 'Généré avec succès') : (j.error || 'Erreur') });
    setTimeout(() => setRunResult(null), 6000);
    load();
  }

  if (loading) return <div className="p-8 text-center text-zinc-400"><Loader2 className="animate-spin mx-auto" size={32} /></div>;

  const quotaPct = stats.quotaMax ? Math.round((stats.quotaUsedToday / stats.quotaMax) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl flex items-center gap-3">
            <Sparkles className="text-fuchsia-400" /> AI Autopilot
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Pilote l'IA autonome du site — toggles, paramètres, quotas, déclenchements manuels.</p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt > 0 && <span className="text-emerald-300 text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Sauvé</span>}
          <button onClick={save} disabled={busy} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Sauvegarder
          </button>
        </div>
      </header>

      {/* QUOTA GLOBAL */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Activity size={18} className="text-cyan-300" />
          <h2 className="font-bold text-lg">Quota Gemini global</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Max appels/jour</label>
            <input type="number" min={50} max={5000} value={cfg[KEYS.quotaDailyMax] || '500'} onChange={(e) => set(KEYS.quotaDailyMax, e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
            <p className="text-[10px] text-zinc-500 mt-1">Free tier Gemini = 1500/jour. On reste safe avec 500.</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Utilisé aujourd'hui</label>
            <div className="bg-zinc-800 rounded h-10 relative overflow-hidden">
              <div className={`h-full transition-all ${quotaPct > 80 ? 'bg-rose-500' : quotaPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(quotaPct, 100)}%` }} />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-sm">
                {stats.quotaUsedToday || 0} / {stats.quotaMax || 500} ({quotaPct}%)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GLD SOUL */}
      <FeatureCard
        icon={<Sparkles className="text-fuchsia-300" size={20} />}
        title="GLD Soul"
        subtitle="La voix du site — une réflexion à la 1ère personne, écrite par IA chaque jour"
      >
        <Field label="Fréquence">
            <option value="weekly">Hebdo (1×/semaine)</option>
          </select>
        </Field>
        <Field label="Ton">
          {running === 'soul' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Générer maintenant l'entrée du jour
        </button>
        {runResult?.feature === 'soul' && (
          <div className={`mt-2 text-xs p-2 rounded ${runResult.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{runResult.ok ? '✓ ' : '⚠ '}{runResult.msg}</div>
        )}
      </FeatureCard>

      {/* MOOD ENGINE */}
      <FeatureCard
        icon={<Heart className="text-rose-300" size={20} />}
        title="Mood Engine"
        subtitle="Le site adapte son ambiance visuelle à l'humeur du jour (déduite de Soul)"
        enabled={isOn(KEYS.moodEnabled)}
        onToggle={(v) => set(KEYS.moodEnabled, v)}
        lastRun={cfg[KEYS.moodLastRunAt]}
        accent="rose"
      >
        <div className="bg-zinc-800/50 rounded p-3 text-xs flex items-center justify-between">
          <span className="text-zinc-400">Humeur actuelle :</span>
          <MoodBadge mood={cfg[KEYS.moodCurrent] || 'neutral'} />
        </div>
        <Toggle label="Adapte couleurs du thème" checked={isOn(KEYS.moodAffectsTheme)} onChange={(v) => set(KEYS.moodAffectsTheme, v)} />
        <Toggle label="Adapte intensité musique d'ambiance" checked={isOn(KEYS.moodAffectsMusic)} onChange={(v) => set(KEYS.moodAffectsMusic, v)} />
        <p className="text-[10px] text-zinc-500 mt-2 flex gap-1 items-start"><Info size={11} className="flex-shrink-0 mt-0.5" /> L'humeur est mise à jour automatiquement quand Soul génère sa réflexion du jour.</p>
      </FeatureCard>

      {/* MODÉRATION */}
      <FeatureCard
        icon={<ShieldAlert className="text-amber-300" size={20} />}
        title="Modération forum IA"
        subtitle="Analyse Gemini de chaque post — auto-hide des contenus toxiques"
        enabled={isOn(KEYS.modEnabled)}
        onToggle={(v) => set(KEYS.modEnabled, v)}
        lastRun={cfg[KEYS.modLastRunAt]}
        accent="amber"
      >
        <Toggle label="Auto-hide les posts au-dessus du seuil" checked={isOn(KEYS.modAutoHide)} onChange={(v) => set(KEYS.modAutoHide, v)} />
        <Field label={`Seuil de toxicité (actuel : ${cfg[KEYS.modThreshold] || '0.7'})`}>
          <input type="range" min="0.3" max="0.95" step="0.05" value={cfg[KEYS.modThreshold] || '0.7'} onChange={(e) => set(KEYS.modThreshold, e.target.value)} className="w-full" />
          <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
            <span>0.3 (strict)</span>
            <span>0.7 (équilibré)</span>
            <span>0.95 (permissif)</span>
          </div>
        </Field>
        <Toggle label="Notifier admin Telegram à chaque hide" checked={isOn(KEYS.modNotifyAdmin)} onChange={(v) => set(KEYS.modNotifyAdmin, v)} />
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-zinc-800 rounded p-2"><div className="text-zinc-400">Décisions 7j</div><div className="font-bold text-lg">{stats.moderation?.decisionsLast7d || 0}</div></div>
          <div className="bg-rose-500/10 rounded p-2"><div className="text-rose-400">Bloqués 7j</div><div className="font-bold text-lg text-rose-300">{stats.moderation?.hiddenLast7d || 0}</div></div>
        </div>
      </FeatureCard>

      {/* NEWSLETTER AUTO */}
      <FeatureCard
        icon={<Mail className="text-emerald-300" size={20} />}
        title="Newsletter auto"
        subtitle="Brouillon hebdo généré par IA depuis l'activité de la semaine"
        enabled={isOn(KEYS.nlEnabled)}
        onToggle={(v) => set(KEYS.nlEnabled, v)}
        lastRun={cfg[KEYS.nlLastRunAt]}
        accent="emerald"
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Jour d'envoi">
            <select value={cfg[KEYS.nlDayOfWeek] || '5'} onChange={(e) => set(KEYS.nlDayOfWeek, e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm w-full">
              <option value="1">Lundi</option><option value="2">Mardi</option><option value="3">Mercredi</option>
              <option value="4">Jeudi</option><option value="5">Vendredi</option>
              <option value="6">Samedi</option><option value="7">Dimanche</option>
            </select>
          </Field>
          <Field label="Heure (0-23)">
            <input type="number" min="0" max="23" value={cfg[KEYS.nlHour] || '10'} onChange={(e) => set(KEYS.nlHour, e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm w-full" />
          </Field>
        </div>
        <Field label="Ton">
          <input type="text" value={cfg[KEYS.nlTone] || ''} onChange={(e) => set(KEYS.nlTone, e.target.value)} placeholder="amical, court, mention témoignages" className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </Field>
        <Toggle label="⚠️ Auto-envoi (sinon, juste un brouillon à valider)" checked={isOn(KEYS.nlAutoSend)} onChange={(v) => set(KEYS.nlAutoSend, v)} dangerColor />
        <button onClick={() => runNow('newsletter')} disabled={running === 'newsletter'} className="mt-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 px-3 py-2 rounded text-xs font-bold flex items-center gap-2 disabled:opacity-50">
          {running === 'newsletter' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Générer un brouillon maintenant
        </button>
        {runResult?.feature === 'newsletter' && (
          <div className={`mt-2 text-xs p-2 rounded ${runResult.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{runResult.ok ? '✓ Brouillon créé : ' : '⚠ '}{runResult.msg}</div>
        )}
      </FeatureCard>

      {/* INFO BOX */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-xs text-cyan-200">
        <div className="flex gap-2 items-start">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-1">Cron Coolify recommandé pour Soul + Newsletter :</p>
            <p className="font-mono text-[10px] bg-black/30 p-2 rounded mb-1">soul-daily : <code>0 8 * * *</code> · POST /api/admin/ai/soul/generate</p>
            <p className="font-mono text-[10px] bg-black/30 p-2 rounded">newsletter-weekly : <code>0 {cfg[KEYS.nlHour] || '10'} * * {cfg[KEYS.nlDayOfWeek] || '5'}</code> · POST /api/admin/ai/newsletter/generate</p>
            <p className="mt-2 text-cyan-300/70">Ajoute ces 2 cron dans Coolify → Scheduled Tasks pour automatiser.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, subtitle, enabled, onToggle, lastRun, accent, children }: any) {
  const accents: Record<string, string> = {
    fuchsia: 'border-fuchsia-500/30 from-fuchsia-500/5',
    rose: 'border-rose-500/30 from-rose-500/5',
    amber: 'border-amber-500/30 from-amber-500/5',
    emerald: 'border-emerald-500/30 from-emerald-500/5'
  };
  return (
    <section className={`bg-gradient-to-br ${accents[accent] || ''} to-transparent border ${accents[accent]?.split(' ')[0] || 'border-zinc-800'} rounded-xl p-5 space-y-3 ${enabled ? '' : 'opacity-70'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon}
          <div>
            <h2 className="font-bold text-lg">{title}</h2>
            <p className="text-xs text-zinc-400">{subtitle}</p>
            {lastRun && <p className="text-[10px] text-zinc-500 mt-1">Dernier run : {new Date(lastRun).toLocaleString('fr-FR')}</p>}
          </div>
        </div>
        <Toggle label={enabled ? 'ON' : 'OFF'} checked={enabled} onChange={onToggle} big />
      </div>
      {enabled && <div className="space-y-3 pt-2 border-t border-zinc-800/50">{children}</div>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div>
      <label className="text-xs text-zinc-400 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, big = false, dangerColor = false }: any) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-xs">
      <button type="button" onClick={() => onChange(!checked)} className={`relative inline-flex ${big ? 'h-7 w-12' : 'h-5 w-9'} rounded-full transition ${checked ? (dangerColor ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-zinc-700'}`}>
        <span className={`absolute top-0.5 ${big ? 'h-6 w-6' : 'h-4 w-4'} bg-white rounded-full transition-transform ${checked ? (big ? 'translate-x-5' : 'translate-x-4') : 'translate-x-0.5'}`} />
      </button>
      <span className={dangerColor && checked ? 'text-amber-300 font-bold' : ''}>{label}</span>
    </label>
  );
}

function MoodBadge({ mood }: { mood: string }) {
  const colors: Record<string, string> = {
    joyful: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    festive: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    calm: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    somber: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
    neutral: 'bg-zinc-700/40 text-zinc-300 border-zinc-600'
  };
  const emojis: Record<string, string> = { joyful: '😊', festive: '🌈', calm: '😌', somber: '🕯', neutral: '🌤' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-bold ${colors[mood] || colors.neutral}`}>
      {emojis[mood] || '🌤'} {mood}
    </span>
  );
}
