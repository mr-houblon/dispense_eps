import { useState, useEffect } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { countExpired, purgeExpired, RETENTION_MONTHS } from '../utils/retention';

/**
 * Panneau « Confidentialité » : rappelle où vivent les données et propose
 * la purge des dispenses trop anciennes. La suppression n'est jamais
 * automatique — elle est toujours confirmée par l'utilisateur.
 */
export const PrivacyPanel = () => {
  const [expired, setExpired] = useState(0);
  const [busy, setBusy] = useState(false);

  // Recalculé à chaque changement du nombre de dispenses.
  const exemptionCount = useLiveQuery(() => db.exemptions.count());

  useEffect(() => {
    countExpired().then(setExpired);
  }, [exemptionCount]);

  /** Accord singulier / pluriel. */
  const plural = (n: number) => (n > 1 ? 's' : '');

  const handlePurge = async () => {
    if (!confirm(
      `Supprimer définitivement ${expired} dispense${plural(expired)} ` +
      `terminée${plural(expired)} ` +
      `depuis plus de ${RETENTION_MONTHS} mois ?\n\n` +
      `Pensez à faire une sauvegarde avant si vous souhaitez en garder une trace.`
    )) return;

    setBusy(true);
    try {
      const deleted = await purgeExpired();
      setExpired(0);
      alert(`🧹 ${deleted} dispense${plural(deleted)} supprimée${plural(deleted)}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ borderLeft: '5px solid #0891b2' }}>
      <h3 style={{ marginTop: 0 }}>🛡️ Confidentialité</h3>

      <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5 }}>
        Toutes les données (élèves, dispenses, justificatifs) sont stockées
        <strong> uniquement sur cet appareil</strong>. Rien n'est envoyé sur
        Internet, aucun compte n'est requis, aucun serveur n'est utilisé.
      </p>

      <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5 }}>
        Les dispenses contiennent des données de santé : conservez-les
        {' '}{RETENTION_MONTHS} mois au maximum et protégez l'accès à
        l'appareil.
      </p>

      {expired > 0 ? (
        <div style={{
          backgroundColor: '#fff7ed', border: '1px solid #fdba74',
          borderRadius: '8px', padding: '12px', marginTop: '15px'
        }}>
          <div style={{ fontSize: '0.9rem', color: '#c2410c', marginBottom: '10px' }}>
            <strong>{expired} dispense{plural(expired)}</strong>
            {expired > 1 ? ' datent ' : ' date '}
            de plus de {RETENTION_MONTHS} mois.
          </div>
          <button
            onClick={handlePurge}
            disabled={busy}
            className="btn"
            style={{ backgroundColor: '#ea580c' }}
          >
            {busy ? 'Suppression…' : '🧹 Purger les données périmées'}
          </button>
        </div>
      ) : (
        <p style={{ fontSize: '0.8rem', color: '#059669', marginTop: '10px', marginBottom: 0 }}>
          ✅ Aucune donnée à purger.
        </p>
      )}
    </div>
  );
};
