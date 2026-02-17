import React, { useState } from 'react';
import { db } from '../db';
import { exportDB, importInto } from "dexie-export-import";

export const BackupManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  // On récupère la date de la dernière sauvegarde (si elle existe) pour l'afficher
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(
    localStorage.getItem('eps-last-backup')
  );

  // --- 1. SAUVEGARDER (EXPORT) ---
  const handleExport = async () => {
    try {
      setIsLoading(true);
      
      // On exporte toute la base (Images incluses !)
      const blob = await exportDB(db, {
        prettyJson: true, // Format lisible (optionnel)
      });

      // On crée le lien de téléchargement
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Nom du fichier : eps_backup_AAAA-MM-JJ.json
      link.download = `eps_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // --- IMPORTANT : On enregistre que la sauvegarde a été faite ---
      const now = new Date().toISOString();
      localStorage.setItem('eps-last-backup', now);
      setLastBackupDate(now); // Met à jour l'affichage immédiatement
      // --------------------------------------------------------------

      alert("✅ Sauvegarde générée avec succès !");
    } catch (error) {
      console.error("Erreur export:", error);
      alert("Erreur lors de la création de la sauvegarde.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. RESTAURER (IMPORT) ---
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Alerte de sécurité critique
    if (!confirm("⚠️ ATTENTION DANGER :\n\nCette action va EFFACER toutes les données actuelles de l'application (élèves, dispenses, photos) pour les remplacer par celles du fichier de sauvegarde.\n\nÊtes-vous sûr de vouloir continuer ?")) {
      event.target.value = ''; // On vide l'input si l'utilisateur annule
      return;
    }

    try {
      setIsLoading(true);
      
      // On supprime la base actuelle pour partir sur du propre
      await db.delete();
      await db.open();

      // On importe le fichier
await importInto(db, file, {
   clearTablesBeforeImport: true,
   acceptMissingTables: true
      });

      alert("✅ Restauration réussie ! L'application va redémarrer.");
      window.location.reload(); // Obligatoire pour rafraîchir Dexie
    } catch (error) {
      console.error("Erreur import:", error);
      alert("Erreur : Le fichier de sauvegarde semble corrompu ou invalide.");
      window.location.reload(); // On recharge par sécurité
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card" style={{ border: '2px solid #6366f1', backgroundColor: '#eef2ff' }}>
      <h3 style={{color: '#4338ca', marginTop: 0}}>💾 Sauvegarde & Restauration</h3>
      
      <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '15px'}}>
        Générez un fichier de secours complet.
        {lastBackupDate && (
          <span style={{display: 'block', color: 'green', fontWeight: 'bold', marginTop: '5px'}}>
            ✅ Dernière sauvegarde : {new Date(lastBackupDate).toLocaleDateString()}
          </span>
        )}
      </p>

      <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
        
        {/* BOUTON EXPORT */}
        <button 
          onClick={handleExport}
          disabled={isLoading}
          className="btn"
          style={{backgroundColor: '#4f46e5'}}
        >
          {isLoading ? '⏳ Traitement...' : '📤 Sauvegarder mes données'}
        </button>

        {/* BOUTON IMPORT (Caché derrière un label stylisé) */}
        <div style={{textAlign: 'center'}}>
          <label 
            htmlFor="backup-upload" 
            style={{
              cursor: isLoading ? 'wait' : 'pointer', 
              color: '#4f46e5', 
              textDecoration: 'underline', 
              fontSize: '0.9rem',
              fontWeight: 'bold',
              opacity: isLoading ? 0.5 : 1
            }}
          >
            📥 Restaurer une sauvegarde...
          </label>
          <input 
            id="backup-upload"
            type="file" 
            accept=".json" 
            onChange={handleImport}
            disabled={isLoading}
            style={{display: 'none'}}
          />
        </div>

      </div>
    </div>
  );
};