// src/db.ts
import Dexie, { type Table } from 'dexie';

// 1. On définit à quoi ressemble un Élève
export interface Student {
  id?: number;         // L'ID unique (généré tout seul)
  firstName: string;   // Prénom
  lastName: string;    // Nom
  classe: string;      // Ex: "3ème B"
}

// 2. On définit à quoi ressemble une Dispense
export interface Exemption {
  id?: number;
  studentId: number;
  startDate: string;
  endDate: string;
  type: 'full' | 'partial';
  sport?: string;
  photo?: Blob | File;
  createdAt?: Date;
}

// 3. On crée la Classe qui gère la base de données
export class EPSDatabase extends Dexie {
  students!: Table<Student>;
  exemptions!: Table<Exemption>;

  constructor() {
    super('EPS_Tracker_DB'); // Le nom de la base dans le navigateur
    
    // On définit les "index" (ce sur quoi on va faire des recherches rapides)
    this.version(1).stores({
      students: '++id, lastName, classe', 
      exemptions: '++id, studentId, startDate'
    });
  }
}

// On exporte une instance prête à l'emploi
export const db = new EPSDatabase();