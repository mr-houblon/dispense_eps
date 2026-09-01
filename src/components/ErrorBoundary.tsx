import React from 'react';
import { APP_VERSION } from '../version';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

/**
 * Dernier filet avant l'écran blanc.
 *
 * useLiveQuery relance l'erreur d'une requête pendant le rendu : sans
 * frontière d'erreur, la moindre défaillance d'IndexedDB vidait toute
 * l'application, sans le moindre message. Ici on affiche au moins de quoi
 * comprendre, et surtout on rappelle que les données ne sont pas perdues —
 * pour éviter le réflexe désastreux d'« effacer les données du site ».
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erreur non rattrapée :', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <div className="card" style={{ borderLeft: '5px solid #dc2626' }}>
          <h2 style={{ marginTop: 0, color: '#dc2626' }}>L'application a rencontré un problème</h2>

          <p style={{ color: '#4b5563', lineHeight: 1.5 }}>
            <strong>Vos données ne sont pas perdues.</strong> Elles restent
            enregistrées sur l'appareil. N'effacez surtout pas les données du
            site : cela les supprimerait définitivement.
          </p>

          <p style={{ color: '#4b5563', lineHeight: 1.5 }}>
            Fermez complètement l'application (retirez-la des applications
            récentes), puis rouvrez-la. Si le problème persiste, exportez une
            sauvegarde depuis un autre appareil ou signalez le message
            ci-dessous.
          </p>

          <pre style={{
            backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px',
            fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            color: '#374151', margin: '16px 0'
          }}>
            {error.name}: {error.message}
          </pre>

          <button className="btn" onClick={() => window.location.reload()}>
            Recharger l'application
          </button>

          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.75rem', marginBottom: 0 }}>
            Version {APP_VERSION}
          </p>
        </div>
      </div>
    );
  }
}
