import React, { useState } from 'react';
import { setPin, verifyPin } from '../utils/pin';

export const PinSettings = () => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{4}$/.test(newPin)) {
      alert('⚠️ Le nouveau code doit contenir exactement 4 chiffres.');
      return;
    }

    setBusy(true);
    try {
      // On exige l'ancien code : sinon n'importe qui ayant l'app déverrouillée
      // sous les yeux pourrait changer le code à votre insu.
      if (!(await verifyPin(currentPin))) {
        alert('❌ Code actuel incorrect.');
        return;
      }

      if (!confirm('Voulez-vous vraiment changer le code de déverrouillage ?')) return;

      await setPin(newPin);
      alert('✅ Nouveau code enregistré !');
      setCurrentPin('');
      setNewPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ borderLeft: '5px solid #8b5cf6' }}>
      <h3>🔐 Sécurité</h3>
      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
        Modifiez le code PIN de l'application.
      </p>

      <form onSubmit={handleSave}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Code actuel"
          className="input-field"
          style={{ textAlign: 'center', letterSpacing: '5px', fontWeight: 'bold' }}
          value={currentPin}
          onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="Nouveau code"
            className="input-field"
            style={{ marginBottom: 0, textAlign: 'center', letterSpacing: '5px', fontWeight: 'bold' }}
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
          />
          <button
            type="submit"
            className="btn"
            disabled={busy}
            style={{ width: 'auto', backgroundColor: '#8b5cf6' }}
          >
            Changer
          </button>
        </div>
      </form>
    </div>
  );
};
