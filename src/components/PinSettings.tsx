import React, { useState } from 'react';

export const PinSettings = () => {
  const [newPin, setNewPin] = useState('');
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      alert("⚠️ Le code doit contenir exactement 4 chiffres.");
      return;
    }

    if (confirm("Voulez-vous vraiment changer le code de déverrouillage ?")) {
      localStorage.setItem('eps-tracker-pin', newPin);
      alert("✅ Nouveau code enregistré !");
      setNewPin('');
    }
  };

  return (
    <div className="card" style={{borderLeft: '5px solid #8b5cf6'}}>
      <h3>🔐 Sécurité</h3>
      <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '15px'}}>
        Modifiez le code PIN de l'application.
      </p>

      <form onSubmit={handleSave} style={{display: 'flex', gap: '10px'}}>
        <input 
          type="tel" // "tel" affiche le clavier numérique sur mobile
          maxLength={4}
          placeholder="Nouveau Code (4 chiffres)" 
          className="input-field" 
          style={{marginBottom: 0, textAlign: 'center', letterSpacing: '5px', fontWeight: 'bold'}}
          value={newPin}
          onChange={e => setNewPin(e.target.value)}
        />
        <button type="submit" className="btn" style={{width: 'auto', backgroundColor: '#8b5cf6'}}>
          Changer
        </button>
      </form>
    </div>
  );
};