import React, { useState, useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // On charge le PIN stocké (ou null si c'est la première fois)
    const saved = localStorage.getItem('eps-tracker-pin');
    setStoredPin(saved);
  }, []);

  // Gestion de la saisie (Chiffres 0-9)
  const handleNumClick = (num: number) => {
    if (pin.length < 4) {
      setPin(prev => prev + num.toString());
      setError(false);
    }
  };

  // Gestion de la correction (Effacer)
  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  // Validation
  const handleSubmit = () => {
    // Cas 1 : Création du code (Première utilisation)
    if (!storedPin) {
      if (pin.length === 4) {
        localStorage.setItem('eps-tracker-pin', pin);
        setStoredPin(pin);
        setIsAuthenticated(true);
      } else {
        alert("Le code doit faire 4 chiffres.");
      }
      return;
    }

    // Cas 2 : Vérification du code
    if (pin === storedPin) {
      setIsAuthenticated(true);
    } else {
      setError(true);
      setPin(''); // On vide le champ si erreur
    }
  };

  // Si on est connecté, on affiche l'application
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // SINON : ÉCRAN DE VERROUILLAGE
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', backgroundColor: '#f3f4f6', padding: '20px'
    }}>
      <div className="card" style={{width: '100%', maxWidth: '350px', textAlign: 'center'}}>
        <h2 style={{color: '#2563eb', marginBottom: '10px'}}>
          🔒 {storedPin ? 'Verrouillé' : 'Créer votre code'}
        </h2>
        
        <p style={{marginBottom: '20px', color: '#666'}}>
          {storedPin ? 'Entrez votre code PIN' : 'Choisissez un code à 4 chiffres'}
        </p>

        {/* ZONE D'AFFICHAGE MASQUÉE */}
        <div style={{
          fontSize: '2rem', 
          letterSpacing: '10px', 
          marginBottom: '20px', 
          height: '50px',
          fontWeight: 'bold',
          color: error ? '#dc2626' : '#111827'
        }}>
          {/* C'est ici qu'on masque : on remplace chaque chiffre par un rond */}
          {pin.split('').map(() => '●').join('')}
          {/* On ajoute des tirets vides pour compléter jusqu'à 4 */}
          {[...Array(4 - pin.length)].map((_, i) => <span key={i} style={{color: '#d1d5db'}}>○</span>)}
        </div>

        {error && <p style={{color: '#dc2626', fontWeight: 'bold'}}>Code incorrect !</p>}

        {/* CLAVIER NUMÉRIQUE */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px'}}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num} 
              onClick={() => handleNumClick(num)}
              className="btn"
              style={{backgroundColor: 'white', color: '#111827', border: '2px solid #e5e7eb', fontSize: '1.5rem'}}
            >
              {num}
            </button>
          ))}
          <div /> {/* Espace vide */}
          <button 
            onClick={() => handleNumClick(0)}
            className="btn"
            style={{backgroundColor: 'white', color: '#111827', border: '2px solid #e5e7eb', fontSize: '1.5rem'}}
          >
            0
          </button>
          <button 
            onClick={handleDelete}
            className="btn"
            style={{backgroundColor: '#fee2e2', color: '#dc2626', border: '2px solid #fecaca', fontSize: '1.2rem'}}
          >
            ⌫
          </button>
        </div>

        <button onClick={handleSubmit} className="btn" style={{marginTop: '10px'}}>
          {storedPin ? 'Déverrouiller' : 'Enregistrer le code'}
        </button>

      </div>
    </div>
  );
};