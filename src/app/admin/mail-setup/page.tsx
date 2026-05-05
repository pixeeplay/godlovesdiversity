'use client';
import { useState } from 'react';
import { Mail, CheckCircle2, Copy, ExternalLink, Loader2, Send } from 'lucide-react';

export default function MailSetupPage() {
  const [tab, setTab] = useState<'workspace' | 'smtp' | 'improvmx'>('improvmx');
  const [domain, setDomain] = useState('pixeeplay.com');
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    const r = await fetch('/api/admin/mail/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testEmail })
    });
    const j = await r.json();
    setTestResult(j);
    setTesting(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 grid place-items-center"><Mail size={18} /></div>
        <div>
          <h1 className="font-display font-bold text-2xl">Configuration mail</h1>
          <p className="text-sm text-zinc-400">3 options Gmail pour ton domaine</p>
        </div>
      </div>

      <div className="my-4">
        <label className="block text-xs font-bold text-zinc-300 mb-1">Ton domaine</label>
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="pixeeplay.com" className="w-full max-w-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="flex gap-2 my-5 border-b border-zinc-800">
        <Tab active={tab === 'improvmx'} onClick={() => setTab('improvmx')} label="🔗 ImprovMX (gratuit)" />
        <Tab active={tab === 'smtp'} onClick={() => setTab('smtp')} label="📧 Gmail SMTP relay" />
        <Tab active={tab === 'workspace'} onClick={() => setTab('workspace')} label="✉️ Gmail Workspace" />
      </div>

      {tab === 'improvmx' && (
        <Section title="Option 1 — ImprovMX + Gmail (combo gratuit recommandé)" cost="0 €/mois">
          <p className="text-sm text-zinc-300 mb-3">Reçois `contact@{domain}` dans ta boîte Gmail perso. Envoi via Gmail SMTP (App Password).</p>
          <Step n={1} title="Créer compte ImprovMX">
            Va sur <ExtLink url="https://improvmx.com/signup" /> → ajoute le domaine <code>{domain}</code>
          </Step>
          <Step n={2} title="Records DNS chez ton registrar">
            <DnsTable rows={[
              { type: 'MX', name: '@', value: 'mx1.improvmx.com', priority: '10' },
              { type: 'MX', name: '@', value: 'mx2.improvmx.com', priority: '20' },
              { type: 'TXT', name: '@', value: 'v=spf1 include:spf.improvmx.com -all', priority: '—' }
            ]} />
          </Step>
          <Step n={3} title="Créer alias">
            Dans ImprovMX → ajoute <code>contact@{domain}</code> → forward vers <code>arnaud@gmail.com</code> (ton Gmail perso)
          </Step>
          <Step n={4} title="Pour répondre depuis Gmail avec l'adresse pro">
            Gmail → Paramètres → Comptes → "Envoyer un mail comme" → ajoute <code>contact@{domain}</code> via SMTP.gmail.com
          </Step>
        </Section>
      )}

      {tab === 'smtp' && (
        <Section title="Option 2 — Gmail SMTP relay (envoi gratuit 500/jour)" cost="0 €/mois">
          <p className="text-sm text-zinc-300 mb-3">Utilise ton compte Gmail (perso ou Workspace) comme relais d'envoi. Newsletters + notifs GLD passent par Gmail.</p>
          <Step n={1} title="Activer 2FA sur ton compte Gmail">
            <ExtLink url="https://myaccount.google.com/security" /> → Validation en deux étapes (obligatoire)
          </Step>
          <Step n={2} title="Créer un App Password">
            <ExtLink url="https://myaccount.google.com/apppasswords" /> → Choisir « Autre » → "GLD Server" → copier les <b>16 caractères</b>
          </Step>
          <Step n={3} title="Coller dans /admin/settings → Gmail SMTP relay">
            <ul className="text-xs space-y-1 mt-2">
              <li><b>Host</b> : <code>smtp.gmail.com</code></li>
              <li><b>Port</b> : <code>587</code></li>
              <li><b>User</b> : ton email Gmail</li>
              <li><b>Password</b> : le App Password (16 chars)</li>
              <li><b>From</b> : <code>"GLD" &lt;contact@{domain}&gt;</code></li>
            </ul>
          </Step>
          <Step n={4} title="Limites">
            Gmail perso : 500 mails/jour. Gmail Workspace : 2000/jour. Au-delà → Resend ou SendGrid.
          </Step>
        </Section>
      )}

      {tab === 'workspace' && (
        <Section title="Option 3 — Gmail Workspace (le top, 6€/mois/user)" cost="6 €/mois/user">
          <p className="text-sm text-zinc-300 mb-3">Vrais comptes Gmail avec ton domaine. Anti-spam Google (le meilleur), 30 GB stockage, Drive + Calendar inclus.</p>
          <Step n={1} title="S'inscrire">
            <ExtLink url="https://workspace.google.com/business/signup/welcome" /> → ajoute ton domaine <code>{domain}</code>
          </Step>
          <Step n={2} title="Vérification domaine (TXT)">
            Ajoute le record TXT donné par Google pour prouver que tu possèdes le domaine.
          </Step>
          <Step n={3} title="Records MX (Gmail)">
            <DnsTable rows={[
              { type: 'MX', name: '@', value: 'smtp.google.com', priority: '1' }
            ]} />
            <p className="text-[10px] text-zinc-500 mt-2">Note : depuis 2023, Google utilise UN SEUL record MX <code>smtp.google.com</code> (avant il y en avait 5).</p>
          </Step>
          <Step n={4} title="DKIM + DMARC">
            Dans Google Admin → Apps → Gmail → Authenticate email → générer DKIM → ajouter le TXT donné. <br/>
            DMARC : ajoute TXT <code>_dmarc.{domain}</code> = <code>v=DMARC1; p=quarantine; rua=mailto:postmaster@{domain}</code>
          </Step>
          <Step n={5} title="Créer comptes utilisateurs">
            Dans Google Admin → Users → Add new user → <code>arnaud@{domain}</code>, <code>contact@{domain}</code>, etc.
          </Step>
          <Step n={6} title="Connecter à GLD">
            Dans /admin/settings → Gmail SMTP relay → host <code>smtp.gmail.com</code> + ton compte Workspace + App Password.
          </Step>
        </Section>
      )}

      {/* TEST SMTP */}
      <div className="mt-8 bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-5">
        <h3 className="font-bold flex items-center gap-2 mb-3"><Send size={16} className="text-emerald-400" /> Tester l'envoi mail</h3>
        <div className="flex gap-2">
          <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="ton@email.com" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <button onClick={sendTest} disabled={!testEmail || testing} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Envoyer test
          </button>
        </div>
        {testResult && (
          <div className={`mt-3 p-3 rounded-lg text-xs ${testResult.ok ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
            {testResult.ok
              ? `✓ Envoyé via ${testResult.provider} — vérifie ta boîte (et le dossier spam)`
              : `❌ Échec via ${testResult.provider} : ${testResult.error}`}
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({ active, onClick, label }: any) {
  return <button onClick={onClick} className={`px-4 py-2 text-sm font-bold border-b-2 transition ${active ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}>{label}</button>;
}
function Section({ title, cost, children }: { title: string; cost: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold">{title}</h2>
        <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">{cost}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-500 text-white grid place-items-center text-xs font-bold flex-shrink-0">{n}</div>
        <div className="flex-1 text-sm">
          <div className="font-bold mb-1">{title}</div>
          <div className="text-zinc-300 text-xs">{children}</div>
        </div>
      </div>
    </div>
  );
}
function DnsTable({ rows }: { rows: { type: string; name: string; value: string; priority: string }[] }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-[11px] border border-zinc-800 rounded">
        <thead className="bg-zinc-800 text-zinc-300">
          <tr><th className="p-2 text-left">Type</th><th className="p-2 text-left">Nom</th><th className="p-2 text-left">Valeur</th><th className="p-2 text-left">Priorité</th><th className="p-2"></th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-zinc-800">
              <td className="p-2 font-mono text-cyan-300">{r.type}</td>
              <td className="p-2 font-mono">{r.name}</td>
              <td className="p-2 font-mono break-all">{r.value}</td>
              <td className="p-2 font-mono">{r.priority}</td>
              <td className="p-2"><button onClick={() => navigator.clipboard.writeText(r.value)} className="text-zinc-500 hover:text-white"><Copy size={11} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ExtLink({ url }: { url: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-1">{url} <ExternalLink size={9} /></a>;
}
