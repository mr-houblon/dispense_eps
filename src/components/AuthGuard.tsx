import React, { useState, useEffect, useRef } from 'react';
import {
  hasPin, setPin as savePin, verifyPin, migrateLegacyPin,
  registerFailedAttempt, resetAttempts, getLockoutRemaining,
  getAttempts, MAX_ATTEMPTS,
} from '../utils/pin';

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Délai après lequel l'application se reverrouille en arrière-plan. */
const AUTO_LOCK_MS = 3 * 60 * 1000;

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPinInput] = useState('');
  // La saisie est doublée dans une ref : deux appuis très rapprochés
  // tomberaient sinon dans le même lot de rendu React et le second
  // chiffre serait perdu.
  const pinRef = useRef('');
  const [pinExists, setPinExists] = useState<boolean | null>(null); // null = pas encore chargé
  const [error, setError] = useState('');
  const [lockout, setLockout] = useState(0);

  const updatePin = (value: string) => {
    pinRef.current = value;
    setPinInput(value);
  };

  // Chargement initial + migration du PIN en clair des versions <= 1.5
  useEffect(() => {
    migrateLegacyPin().then(() => {
      setPinExists(hasPin());
      setLockout(getLockoutRemaining());
    });
  }, []);

  // Décompte du blocage
  useEffect(() => {
    if (lockout <= 0) return;
    const timer = setInterval(() => {
      const remaining = getLockoutRemaining();
      setLockout(remaining);
      if (remaining === 0) setError('');
    }, 1000);
    return () => clearInterval(timer);
  }, [lockout]);

  // Re-verrouillage automatique : sans cela, le PIN ne sert à rien dès que
  // l'application reste ouverte en arrière-plan sur le téléphone.
  useEffect(() => {
    if (!isAuthenticated) return;
    let hiddenSince = 0;

    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenSince = Date.now();
      } else if (hiddenSince && Date.now() - hiddenSince > AUTO_LOCK_MS) {
        setIsAuthenticated(false);
        updatePin('');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isAuthenticated]);

  const submit = async (code: string) => {
    if (lockout > 0) return;

    // Cas 1 : création du code (première utilisation)
    if (!pinExists) {
      if (code.length !== 4) {
        setError('Le code doit faire 4 chiffres.');
        return;
      }
      await savePin(code);
      setPinExists(true);
      setIsAuthenticated(true);
      return;
    }

    // Cas 2 : vérification
    if (await verifyPin(code)) {
      resetAttempts();
      setIsAuthenticated(true);
      return;
    }

    const attempts = registerFailedAttempt();
    updatePin('');
    const remaining = MAX_ATTEMPTS - attempts;

    if (remaining > 0) {
      setError(`Code incorrect (${remaining} essai${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''})`);
    } else {
      setLockout(getLockoutRemaining());
      setError('Trop de tentatives.');
    }
  };

  const handleNumClick = (num: number) => {
    if (lockout > 0 || pinRef.current.length >= 4) return;

    const next = pinRef.current + num.toString();
    updatePin(next);
    setError('');

    // Validation automatique dès le 4e chiffre : plus fluide au doigt.
    // (En création de code, on laisse l'utilisateur relire son choix.)
    if (next.length === 4 && pinExists) {
      void submit(next);
    }
  };

  const handleDelete = () => updatePin(pinRef.current.slice(0, -1));


  // Tant que le PIN n'est pas chargé, on n'affiche rien : cela évite
  // le clignotement « Créer votre code » chez un utilisateur qui en a déjà un.
  if (pinExists === null) {
    return <div style={{ height: '100vh', backgroundColor: '#f3f4f6' }} />;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const disabled = lockout > 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', backgroundColor: '#f3f4f6', padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '350px', textAlign: 'center' }}>
        <h2 style={{ color: '#2563eb', marginBottom: '10px' }}>
          🔒 {pinExists ? 'Verrouillé' : 'Créer votre code'}
        </h2>

        <p style={{ marginBottom: '20px', color: '#666' }}>
          {pinExists ? 'Entrez votre code PIN' : 'Choisissez un code à 4 chiffres'}
        </p>

        {/* ZONE D'AFFICHAGE MASQUÉE */}
        <div style={{
          fontSize: '2rem', letterSpacing: '10px', marginBottom: '20px',
          height: '50px', fontWeight: 'bold',
          color: error ? '#dc2626' : '#111827'
        }}>
          {pin.split('').map(() => '●').join('')}
          {[...Array(4 - pin.length)].map((_, i) => (
            <span key={i} style={{ color: '#d1d5db' }}>○</span>
          ))}
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontWeight: 'bold', minHeight: '24px' }}>{error}</p>
        )}

        {disabled && (
          <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
            Réessayez dans {lockout} s
          </p>
        )}

        {/* CLAVIER NUMÉRIQUE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleNumClick(num)}
              disabled={disabled}
              className="keypad-btn"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleNumClick(0)}
            disabled={disabled}
            className="keypad-btn"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={disabled}
            className="keypad-btn delete"
          >
            ⌫
          </button>
        </div>

        {/* En création, la validation reste manuelle pour laisser le temps
            de relire le code choisi. */}
        {!pinExists && (
          <button onClick={() => void submit(pin)} className="btn" style={{ marginTop: '10px' }}>
            Enregistrer le code
          </button>
        )}

        {pinExists && getAttempts() > 0 && !disabled && (
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '10px' }}>
            En cas d'oubli du code, restaurez une sauvegarde après avoir
            réinstallé l'application.
          </p>
        )}
      </div>
    </div>
  );
};
