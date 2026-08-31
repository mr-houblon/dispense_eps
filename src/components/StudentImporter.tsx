import React, { useState } from 'react';
import Papa from 'papaparse';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

/** Une ligne du CSV. Les en-têtes acceptés varient (Nom/Name, Prenom/Prénom...). */
interface CsvRow {
  Nom?: string; Name?: string;
  Prenom?: string; 'Prénom'?: string; FirstName?: string;
  Classe?: string; Class?: string;
}

export const StudentImporter = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const studentCount = useLiveQuery(() => db.students.count());
  const exemptionCount = useLiveQuery(() => db.exemptions.count());

  // --- NOUVEAU : Fonction pour télécharger le template ---
  const handleDownloadTemplate = () => {
    // 1. Le contenu du CSV (En-têtes + 1 exemple)
    const csvContent = "Nom,Prenom,Classe\nDupont,Jean,3ème A\nMartin,Sophie,4ème B";
    
    // 2. Création du fichier virtuel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 3. Déclenchement du téléchargement
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_eleves.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- LOGIQUE D'IMPORT (Inchangée) ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        let added = 0;
        let updated = 0;

        await db.transaction('rw', db.students, async () => {
          for (const row of rows) {
            // On gère les différentes orthographes possibles des colonnes
            const nom = row.Nom || row.Name;
            const prenom = row.Prenom || row['Prénom'] || row.FirstName;
            const classe = row.Classe || row.Class;

            if (nom && prenom && classe) {
              const existingStudent = await db.students
                .where({ lastName: nom, firstName: prenom })
                .first();

              if (existingStudent) {
                await db.students.update(existingStudent.id!, { classe: classe });
                updated++;
              } else {
                await db.students.add({
                  lastName: nom,
                  firstName: prenom,
                  classe: classe
                });
                added++;
              }
            }
          }
        });

        alert(`✅ Terminé !\n- Nouveaux : ${added}\n- Mis à jour : ${updated}`);
        setIsProcessing(false);
        event.target.value = '';
      },
      error: () => {
        alert("Erreur lors de la lecture du fichier CSV.");
        setIsProcessing(false);
      }
    });
  };

  // --- LOGIQUE RESET (Inchangée) ---
  const handleFullReset = async () => {
    if(!confirm("⚠️ ATTENTION : Vous allez effacer TOUTES les données (élèves ET dispenses).")) return;
    if(!confirm("C'est irréversible. Confirmer ?")) return;

    await db.transaction('rw', db.students, db.exemptions, async () => {
      await db.students.clear();
      await db.exemptions.clear();
    });
    alert("♻️ Base de données remise à zéro !");
  };

  return (
    <div className="card" style={{ border: '2px solid #e5e7eb', backgroundColor: '#fff' }}>
      <h3>⚙️ Gestion des Données</h3>
      
      {/* SECTION 1 : IMPORT */}
      <div style={{marginBottom: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
          <label style={{fontWeight: 'bold'}}>
            📂 Mettre à jour la liste
          </label>
          
          {/* BOUTON TEMPLATE */}
          <button 
            onClick={handleDownloadTemplate}
            style={{
              fontSize: '0.8rem', 
              background: 'none', 
              border: '1px solid #2563eb', 
              color: '#2563eb',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📄 Télécharger un modèle
          </button>
        </div>

        <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '10px'}}>
          Format : <code>Nom,Prenom,Classe</code>
        </p>
        
        <input 
          type="file" 
          accept=".csv" 
          disabled={isProcessing}
          onChange={handleFileUpload} 
          style={{ width: '100%', padding: '10px', border: '1px dashed #ccc' }}
        />
        {isProcessing && <p style={{color: 'blue'}}>Traitement en cours...</p>}
      </div>

      <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid #eee'}} />

      {/* SECTION 2 : STATS & RESET */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontSize: '0.8rem', color: '#666'}}>
          <strong>État actuel :</strong><br/>
          🧑‍🎓 {studentCount || 0} Élèves<br/>
          📄 {exemptionCount || 0} Dispenses
        </div>

        <button 
          onClick={handleFullReset}
          style={{
            backgroundColor: '#fff1f2', 
            color: '#e11d48', 
            border: '1px solid #e11d48',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}
        >
          🗑️ Tout effacer
        </button>
      </div>
    </div>
  );
};