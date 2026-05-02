'use client';
import { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, X, Check } from 'lucide-react';
import { getRiskInfo, lookupRiskByName } from '@/lib/risk-countries';

type Props = {
  open: boolean;
  countryCode?: string | null;
  countryName?: string | null;
  onAccept: () => void;
  onCancel: () => void;
};

const DEFAULT_TEXT = `En envoyant cette photo, vous certifiez :

• avoir le droit de partager ce contenu (vous en êtes l'auteur ou avez l'autorisation des personnes visibles) ;
• autoriser le mouvement God Loves Diversity à utiliser cette image gratuitement, dans le monde entier, pour ses communications (site web, réseaux sociaux, newsletters, affiches, supports promotionnels et tout autre support de communication relatif au mouvement) ;
• comprendre que la photo pourra être éditée, recadrée, ou floutée pour préserver la vie privée des personnes visibles.

Vous pouvez à tout moment demander le retrait d'une photo en écrivant à contact@godlovesdiversity.org.`;

export function UploadConsentModal({ open, countryCode, countryName, onAccept, onCancel }: Props) {
  const [consentText, setConsentText] = useState(DEFAULT_TEXT);
  const [agreeRights, setAgreeRights] = useState(false);
  const [agreePromo, setAgreePromo] = useState(false);

  const risk = getRiskInfo(countryCode) || lookupRiskByName(countryName);

  useEffect(() => {
    if (!open) return;
    fetch('/api/settings/public?keys=upload.consentText')
      .then((r) => r.json())
      .then((j) => {
        if (j['upload.consentText']) setConsentText(j['upload.consentText']);
      })
      .catch(() => {});
    setAgreeRights(false);
    setAgreePromo(false);
  }, [open]);

  if (!open) return null;

  const canSubmit = agreeRights && agreePromo;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl max-w-2xl w-full my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-display text-xl font-bold flex items-center gap-2 text-white">
            <ShieldAlert className="text-brand-pink" /> Avant d'envoyer ta photo
          </h2>
          <button onClick={onCancel} className="text-white/60 hover:text-white">
            <X />
          </button>
        </div>

        {/* Country risk warning */}
        {risk && (
          <div className={`px-5 py-4 ${risk.level === 'death' ? 'bg-red-950/60 border-b border-red-700' : risk.level === 'illegal' ? 'bg-orange-950/60 border-b border-orange-700' : 'bg-amber-950/60 border-b border-amber-700'}`}>
            <div className="flex gap-3 items-start">
              <AlertTriangle className="shrink-0 mt-0.5" size={22} style={{ color: risk.level === 'death' ? '#FCA5A5' : '#FDBA74' }} />
              <div className="text-sm text-white/90">
                <p className="font-bold mb-1">
                  ⚠️ Attention — {risk.name}
                </p>
                <p>
                  L'homosexualité est{' '}
                  {risk.level === 'death' && <strong className="text-red-300">passible de la peine de mort</strong>}
                  {risk.level === 'illegal' && <strong className="text-orange-300">criminalisée</strong>}
                  {risk.level === 'persecuted' && <strong className="text-amber-300">fortement réprimée</strong>}
                  {' '}dans ce pays.
                </p>
                <p className="mt-2">
                  Pour ta sécurité et celle des personnes visibles : <strong>évite de partager une photo géolocalisée précisément</strong>,
                  ne montre aucun visage identifiable, et réfléchis bien avant de cliquer sur Envoyer.
                  Tu peux aussi envoyer la photo <strong>sans coordonnées GPS</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Body — consent text */}
        <div className="p-5 space-y-4 text-sm text-white/85 max-h-[40vh] overflow-y-auto">
          <p className="whitespace-pre-line">{consentText}</p>
        </div>

        {/* Checkboxes */}
        <div className="px-5 pb-2 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreeRights} onChange={(e) => setAgreeRights(e.target.checked)}
                   className="mt-1 w-5 h-5 accent-brand-pink shrink-0" />
            <span className="text-sm text-white/90">
              <strong>J'ai le droit</strong> de partager cette photo (auteur ou autorisation des personnes visibles).
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreePromo} onChange={(e) => setAgreePromo(e.target.checked)}
                   className="mt-1 w-5 h-5 accent-brand-pink shrink-0" />
            <span className="text-sm text-white/90">
              <strong>J'autorise</strong> God Loves Diversity à utiliser cette image dans toutes ses communications
              (site, réseaux, newsletters, affiches, promotion).
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-end bg-zinc-900/60">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm font-semibold border border-white/10"
          >
            Annuler
          </button>
          <button
            onClick={onAccept}
            disabled={!canSubmit}
            className="px-6 py-2.5 rounded-full bg-brand-pink hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center gap-2"
          >
            <Check size={16} /> J'accepte et j'envoie
          </button>
        </div>
      </div>
    </div>
  );
}
