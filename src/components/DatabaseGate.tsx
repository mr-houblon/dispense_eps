import { useEffect, useState } from 'react';
import { openDatabase, describeDbError } from '../db';

interface Props { children: React.ReactNode }

/**
 * Ouvre la base avant d'afficher quoi que ce soit.
 *
 * Sans cela, chaque écran ouvrait la base paresseusement : un échec ou un
 * blocage se traduisait par un « Chargement… » qui ne se terminait jamais
 * (useLiveQuery reste indéfiniment sur undefined), sans aucune explication.
 * On centralise ici : soit la base s'ouvre, soit l'utilisateur lit pourquoi
 * elle ne s'ouvre pas et peut réessayer.
 */
export const DatabaseGate = ({ children }: Props) => {
  const [state, setState] = useState<'opening' | 'ready' | 'failed'>('opening');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    openDatabase().then(
      () => { if (!cancelled) setState('ready'); },
      (error) => {
        console.error("Ouverture de la base impossible :", error);
        if (cancelled) return;
        setMessage(describeDbError(error));
        setState('failed');
      }
    );

    return () => { cancelled = true; };
  }, [attempt]);

  if (state === 'ready') return <>{children}</>;

  if (state === 'opening') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: '#6b7280'
      }}>
        Ouverture de la base…
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <div className="card" style={{ borderLeft: '5px solid #dc2626' }}>
        <h2 style={{ marginTop: 0, color: '#dc2626' }}>Base de données inaccessible</h2>

        <p style={{ color: '#4b5563', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{message}</p>

        <p style={{ color: '#4b5563', lineHeight: 1.5 }}>
          <strong>Vos données ne sont pas perdues.</strong> N'effacez surtout
          pas les données du site : c'est la seule manœuvre qui les
          supprimerait pour de bon.
        </p>

        <button className="btn" onClick={() => { setState('opening'); setAttempt((n) => n + 1); }}>
          Réessayer
        </button>
      </div>
    </div>
  );
};
