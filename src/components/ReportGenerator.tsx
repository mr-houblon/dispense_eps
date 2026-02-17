import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../db';

export const ReportGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    // 1. On récupère toutes les données
    const exemptions = await db.exemptions.toArray();
    const students = await db.students.toArray();
    
    // --- CALCUL DES STATISTIQUES (Nouveau) ---
    // On compte combien de dispenses a chaque élève au total
    const stats: Record<number, number> = {};
    exemptions.forEach(ex => {
      if (ex.studentId) {
        stats[ex.studentId] = (stats[ex.studentId] || 0) + 1;
      }
    });

    // 2. On prépare le document PDF
    const doc = new jsPDF();

    // En-tête du document
    doc.setFontSize(18);
    doc.text("Bilan des Dispenses EPS", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Généré le : ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total dispenses enregistrées : ${exemptions.length}`, 14, 36);

    // 3. Préparation des données pour le tableau
    const tableData = exemptions
      .map(ex => {
        const student = students.find(s => s.id === ex.studentId);
        // Si l'élève est trouvé, on prend ses infos, sinon "Inconnu"
        const lastName = student ? student.lastName.toUpperCase() : '???';
        const firstName = student ? student.firstName : '';
        const studentClass = student ? student.classe : '?';
        
        // Formatage des dates
        const start = new Date(ex.startDate).toLocaleDateString();
        const end = new Date(ex.endDate).toLocaleDateString();
        const dates = `${start} au ${end}`;
        
        const motif = ex.type === 'full' ? 'Inapte Total' : `Partiel (${ex.sport})`;
        
        // Le nombre total pour cet élève
        const totalDispenses = stats[ex.studentId] || 0;

        return {
          rawName: lastName, // Utile pour le tri juste après
          row: [
            `${lastName} ${firstName}`, // Colonne 1 : Nom Prénom
            studentClass,               // Colonne 2 : Classe
            dates,                      // Colonne 3 : Dates
            motif,                      // Colonne 4 : Motif
            totalDispenses              // Colonne 5 : Cumul (Nouveau !)
          ]
        };
      })
      // On trie par Nom de famille pour regrouper les élèves
      .sort((a, b) => a.rawName.localeCompare(b.rawName))
      .map(item => item.row); // On ne garde que les données affichables

    // 4. Génération du tableau
    autoTable(doc, {
      head: [['Élève', 'Classe', 'Période', 'Motif', 'Total']], // Ajout de la colonne Total
      body: tableData,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 10, valign: 'middle' },
      headStyles: { fillColor: [37, 99, 235] }, // Bleu
      columnStyles: {
        0: { fontStyle: 'bold' }, // Nom en gras
        4: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] } // Total centré et en rouge
      }
    });

    // 5. Sauvegarde
    doc.save(`bilan_eps_${new Date().toISOString().slice(0,10)}.pdf`);
    
    setIsGenerating(false);
  };

  return (
    <div className="card" style={{marginTop: '20px', backgroundColor: '#f0fdf4', borderColor: '#86efac'}}>
      <h3>🖨️ Espace Administratif</h3>
      <p style={{fontSize: '0.9rem', color: '#666'}}>
        Générez un rapport PDF incluant le cumul des dispenses par élève.
      </p>
      
      <button 
        className="btn" 
        onClick={generatePDF} 
        disabled={isGenerating}
        style={{backgroundColor: '#16a34a'}}
      >
        {isGenerating ? 'Génération en cours...' : 'Télécharger le Bilan PDF'}
      </button>
    </div>
  );
};