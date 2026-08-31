import React, { useState } from 'react';
import Papa from 'papaparse';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  fetchSheetCsv, getSavedSheetUrl, saveSheetUrl, SheetError,
} from '../utils/sheets';

/** Une ligne du CSV. Les en-têtes acceptés varient (Nom/Name, Prenom/Prénom...). */
interface CsvRow {
  Nom?: string; Name?: string;
  Prenom?: string; 'Prénom'?: string; FirstName?: string;
  Classe?: string; Class?: string;
}

interface ImportResult {
  added: number;
  updated: number;
  ignored: number;
  /** Élèves présents dans l'application mais absents de la source. */
  missing: number;
}

export const StudentImporter = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(getSavedSheetUrl());
  const studentCount = useLiveQuery(() => db.students.count());
  const exemptionCount = useLiveQuery(() => db.exemptions.count());

  /* ------------------------------------------------------------------
     Logique d'import commune au fichier CSV et à la feuille Google.
     ------------------------------------------------------------------ */

  const importRows = async (rows: CsvRow[]): Promise<ImportResult> => {
    let added = 0;
    let updated = 0;
    let ignored = 0;
    const seen = new Set<string>();

    await db.transaction('rw', db.students, async () => {
      for (const row of rows) {
        // On gère les différentes orthographes possibles des colonnes
        const nom = row.Nom?.trim() || row.Name?.trim();
        const prenom = row.Prenom?.trim() || row['Prénom']?.trim() || row.FirstName?.trim();
        const classe = row.Classe?.trim() || row.Class?.trim();

        if (!nom || !prenom || !classe) {
          ignored++;
          continue;
        }

        seen.add(`${nom.toLowerCase()}|${prenom.toLowerCase()}`);

        const existing = await db.students
          .where({ lastName: nom, firstName: prenom })
          .first();

        if (existing) {
          await db.students.update(existing.id!, { classe });
          updated++;
        } else {
          await db.students.add({ lastName: nom, firstName: prenom, classe });
          added++;
        }
      }
    });

    // L'import ne supprime jamais personne : un élève retiré de la source
    // reste dans l'application, car ses dispenses passées le référencent.
    // On se contente de le signaler.
    const all = await db.students.toArray();
    const missing = all.filter(
      (s) => !seen.has(`${s.lastName.toLowerCase()}|${s.firstName.toLowerCase()}`)
    ).length;

    return { added, updated, ignored, missing };
  };

  const reportResult = (source: string, r: ImportResult) => {
    const lignes = [
      `${source} : terminé`,
      '',
      `Nouveaux élèves : ${r.added}`,
      `Mis à jour : ${r.updated}`,
    ];
    if (r.ignored > 0) {
      lignes.push(`Lignes ignorées (incomplètes) : ${r.ignored}`);
    }
    if (r.missing > 0) {
      lignes.push('', `${r.missing} élève(s) de l'application ne figurent pas dans la source.`);
      lignes.push('Ils ont été conservés : leurs dispenses passées y font référence.');
    }
    alert(lignes.join('\n'));
  };

  /* ------------------------------------------------------------------
     1. Synchronisation depuis Google Sheets
     ------------------------------------------------------------------ */

  const handleSheetSync = async () => {
    if (!sheetUrl.trim()) {
      alert("Collez d'abord le lien de votre feuille Google Sheets.");
      return;
    }

    setIsProcessing(true);
    try {
      const csv = await fetchSheetCsv(sheetUrl);
      saveSheetUrl(sheetUrl);

      const parsed = Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: true });
      const result = await importRows(parsed.data);
      reportResult('Synchronisation Google Sheets', result);
    } catch (error) {
      if (error instanceof SheetError) {
        alert(error.message);
      } else {
        console.error(error);
        alert('Erreur inattendue pendant la synchronisation.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /* ------------------------------------------------------------------
     2. Import d'un fichier CSV (secours hors ligne)
     ------------------------------------------------------------------ */

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const result = await importRows(results.data);
          reportResult('Import du fichier', result);
        } finally {
          setIsProcessing(false);
          event.target.value = '';
        }
      },
      error: () => {
        alert('Erreur lors de la lecture du fichier CSV.');
        setIsProcessing(false);
      },
    });
  };

  /* ------------------------------------------------------------------
     3. Modèle et remise à zéro
     ------------------------------------------------------------------ */

  const handleDownloadTemplate = () => {
    const csvContent = 'Nom,Prenom,Classe\nDupont,Jean,3ème A\nMartin,Sophie,4ème B';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_eleves.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFullReset = async () => {
    if (!confirm('ATTENTION : Vous allez effacer TOUTES les données (élèves ET dispenses).')) return;
    if (!confirm("C'est irréversible. Confirmer ?")) return;

    await db.transaction('rw', db.students, db.exemptions, async () => {
      await db.students.clear();
      await db.exemptions.clear();
    });
    alert('Base de données remise à zéro !');
  };

  return (
    <div className="card" style={{ border: '2px solid #e5e7eb', backgroundColor: '#fff' }}>
      <h3>⚙️ Gestion des Données</h3>

      {/* SECTION 1 : GOOGLE SHEETS */}
      <div style={{
        backgroundColor: '#f0fdf4', border: '1px solid #86efac',
        borderRadius: '8px', padding: '12px', marginBottom: '20px'
      }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
          📊 Liste depuis Google Sheets
        </label>
        <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: 0, marginBottom: '10px' }}>
          Colonnes attendues : <code>Nom, Prenom, Classe</code>. La feuille doit
          être partagée en « Tous ceux qui disposent du lien ».
        </p>

        <input
          type="url"
          className="input-field"
          placeholder="Collez ici le lien de votre feuille…"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          onBlur={() => saveSheetUrl(sheetUrl)}
          style={{ fontSize: '0.85rem' }}
        />

        <button
          onClick={handleSheetSync}
          disabled={isProcessing}
          className="btn"
          style={{ backgroundColor: '#16a34a' }}
        >
          {isProcessing ? 'Synchronisation…' : 'Synchroniser maintenant'}
        </button>
      </div>

      {/* SECTION 2 : FICHIER CSV */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>📂 …ou depuis un fichier</label>

          <button
            onClick={handleDownloadTemplate}
            style={{
              fontSize: '0.8rem', background: 'none', border: '1px solid #2563eb',
              color: '#2563eb', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer'
            }}
          >
            📄 Modèle
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>
          Utile hors connexion, ou si vous préférez garder la feuille privée.
        </p>

        <input
          type="file"
          accept=".csv"
          disabled={isProcessing}
          onChange={handleFileUpload}
          style={{ width: '100%', padding: '10px', border: '1px dashed #ccc' }}
        />
        {isProcessing && <p style={{ color: 'blue' }}>Traitement en cours…</p>}
      </div>

      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />

      {/* SECTION 3 : STATS & RESET */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8rem', color: '#666' }}>
          <strong>État actuel :</strong><br />
          🧑‍🎓 {studentCount || 0} Élèves<br />
          📄 {exemptionCount || 0} Dispenses
        </div>

        <button
          onClick={handleFullReset}
          style={{
            backgroundColor: '#fff1f2', color: '#e11d48', border: '1px solid #e11d48',
            padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 'bold'
          }}
        >
          🗑️ Tout effacer
        </button>
      </div>
    </div>
  );
};
