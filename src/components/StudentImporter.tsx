import React, { useState } from 'react';
import Papa from 'papaparse';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  fetchSheetCsv, getSavedSheetUrl, saveSheetUrl, SheetError,
} from '../utils/sheets';
import { byName, isActive, isArchived, fullName, studentKey } from '../utils/students';

/** Une ligne du CSV. Les en-têtes acceptés varient (Nom/Name, Prenom/Prénom...). */
interface CsvRow {
  Nom?: string; Name?: string;
  Prenom?: string; 'Prénom'?: string; FirstName?: string;
  Classe?: string; Class?: string;
}

interface ImportResult {
  added: number;
  updated: number;
  /** Élèves archivés qui réapparaissent dans la source. */
  restored: number;
  ignored: number;
  /** Élèves de l'application absents de la source : retirés des listes. */
  archived: number;
}

export const StudentImporter = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(getSavedSheetUrl());

  const students = useLiveQuery(() => db.students.toArray());
  const exemptionCount = useLiveQuery(() => db.exemptions.count());

  const activeStudents = (students ?? []).filter(isActive);
  const archivedStudents = (students ?? []).filter(isArchived).sort(byName);

  /* ------------------------------------------------------------------
     Logique d'import commune au fichier CSV et à la feuille Google.

     La source fait autorité : un élève qui n'y figure plus disparaît des
     écrans de saisie. Il n'est pas supprimé pour autant — ses dispenses
     passées le référencent par son identifiant, et l'historique doit
     continuer à afficher son nom. On l'archive.
     ------------------------------------------------------------------ */

  const importRows = async (rows: CsvRow[]): Promise<ImportResult> => {
    let added = 0;
    let updated = 0;
    let restored = 0;
    let ignored = 0;
    let archived = 0;
    const seen = new Set<string>();
    const today = new Date().toISOString().split('T')[0];

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

        seen.add(studentKey(nom, prenom));

        const existing = await db.students
          .where('[lastName+firstName]')
          .equals([nom, prenom])
          .first();

        if (existing) {
          // archivedAt: undefined supprime la propriété (convention Dexie),
          // ce qui remet l'élève dans les listes s'il en était sorti.
          await db.students.update(existing.id!, { classe, archivedAt: undefined });
          if (isArchived(existing)) restored++;
          else updated++;
        } else {
          await db.students.add({ lastName: nom, firstName: prenom, classe });
          added++;
        }
      }

      // Archivage de ceux que la source ne mentionne plus.
      const all = await db.students.toArray();
      for (const s of all) {
        if (seen.has(studentKey(s.lastName, s.firstName))) continue;
        if (isArchived(s)) continue;
        await db.students.update(s.id!, { archivedAt: today });
        archived++;
      }
    });

    return { added, updated, restored, ignored, archived };
  };

  const reportResult = (source: string, r: ImportResult) => {
    const lignes = [
      `${source} : terminé`,
      '',
      `Nouveaux élèves : ${r.added}`,
      `Mis à jour : ${r.updated}`,
    ];
    if (r.restored > 0) {
      lignes.push(`Réintégrés : ${r.restored}`);
    }
    if (r.ignored > 0) {
      lignes.push(`Lignes ignorées (incomplètes) : ${r.ignored}`);
    }
    if (r.archived > 0) {
      lignes.push(
        '',
        `${r.archived} élève(s) absent(s) de la source ont été retirés des listes de saisie.`,
        "Leurs dispenses passées restent consultables dans l'Historique.",
      );
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

      // Garde-fou : une feuille dont la lecture échoue à moitié (mauvais
      // onglet, en-têtes renommés) archiverait toute la promotion d'un coup.
      const usable = parsed.data.filter(
        (r) => (r.Nom || r.Name) && (r.Prenom || r['Prénom'] || r.FirstName)
      );
      if (usable.length === 0) {
        alert(
          "La feuille ne contient aucune ligne exploitable.\n\n" +
          "Vérifiez que la première ligne porte bien les en-têtes " +
          "Nom, Prenom, Classe, et que le bon onglet est partagé.\n\n" +
          "Rien n'a été modifié."
        );
        return;
      }

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
     3. Élèves retirés
     ------------------------------------------------------------------ */

  /**
   * Suppression définitive des élèves retirés qui n'ont aucune dispense.
   * Ceux qui en ont une sont conservés : les effacer transformerait leur
   * historique en « Élève inconnu ».
   */
  const handlePurgeArchived = async () => {
    const removable: number[] = [];
    let kept = 0;

    for (const s of archivedStudents) {
      const count = await db.exemptions.where('studentId').equals(s.id!).count();
      if (count === 0) removable.push(s.id!);
      else kept++;
    }

    if (removable.length === 0) {
      alert(
        kept > 0
          ? `Les ${kept} élève(s) retiré(s) ont tous des dispenses enregistrées : ` +
            "ils sont conservés pour que l'historique reste lisible."
          : 'Aucun élève à supprimer.'
      );
      return;
    }

    const message = [
      `Supprimer définitivement ${removable.length} élève(s) retiré(s) sans aucune dispense ?`,
    ];
    if (kept > 0) {
      message.push('', `${kept} autre(s) seront conservés : ils ont des dispenses dans l'historique.`);
    }
    if (!confirm(message.join('\n'))) return;

    await db.students.bulkDelete(removable);
    alert(`${removable.length} élève(s) supprimé(s).`);
  };

  /* ------------------------------------------------------------------
     4. Modèle et remise à zéro
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
          être partagée en « Tous ceux qui disposent du lien ». Elle fait
          autorité : les élèves qui n'y figurent plus sortent des listes de
          saisie.
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

      {/* SECTION 3 : ÉLÈVES RETIRÉS */}
      {archivedStudents.length > 0 && (
        <div style={{
          backgroundColor: '#f9fafb', border: '1px solid #e5e7eb',
          borderRadius: '8px', padding: '12px', marginBottom: '20px'
        }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
            👋 {archivedStudents.length} élève(s) retiré(s) de la liste
          </label>
          <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: 0 }}>
            Absents de la source, ils n'apparaissent plus au moment de saisir
            une dispense, mais restent nommés dans l'Historique.
          </p>

          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '10px' }}>
            {archivedStudents.slice(0, 8).map((s) => (
              <div key={s.id}>{fullName(s)} — {s.classe}</div>
            ))}
            {archivedStudents.length > 8 && <div>…et {archivedStudents.length - 8} autres.</div>}
          </div>

          <button
            onClick={handlePurgeArchived}
            style={{
              fontSize: '0.8rem', background: 'none', border: '1px solid #6b7280',
              color: '#4b5563', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer'
            }}
          >
            Supprimer ceux qui n'ont aucune dispense
          </button>
        </div>
      )}

      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />

      {/* SECTION 4 : STATS & RESET */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8rem', color: '#666' }}>
          <strong>État actuel :</strong><br />
          🧑‍🎓 {activeStudents.length} Élèves
          {archivedStudents.length > 0 && ` (+ ${archivedStudents.length} retirés)`}<br />
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
