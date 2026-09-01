// src/db.ts
import Dexie, { type Table } from 'dexie';

// 1. On définit à quoi ressemble un Élève
export interface Student {
  id?: number;         // L'ID unique (généré tout seul)
  firstName: string;   // Prénom
  lastName: string;    // Nom
  classe: string;      // Ex: "3ème B"
  /**
   * Date (AAAA-MM-JJ) à laquelle l'élève a cessé de figurer dans la source
   * (feuille Google Sheets ou fichier CSV). Absent = élève toujours inscrit.
   *
   * On archive au lieu de supprimer : les dispenses passées référencent
   * l'élève par son id, et l'historique doit continuer à afficher son nom.
   * Les archivés n'apparaissent plus dans les listes de saisie.
   */
  archivedAt?: string;
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

    // v2 : index composé [lastName+firstName]. L'import cherchait l'élève
    // existant avec where({lastName, firstName}) alors que firstName n'était
    // pas indexé : Dexie parcourait alors toute la table à chaque ligne.
    //
    // archivedAt n'est volontairement PAS indexé : un index IndexedDB ignore
    // les enregistrements dont la clé est absente, et « non archivé » est
    // justement représenté par l'absence de valeur. On filtre en mémoire.
    this.version(2).stores({
      students: '++id, lastName, classe, [lastName+firstName]',
      exemptions: '++id, studentId, startDate'
    });
  }
}

// On exporte une instance prête à l'emploi
export const db = new EPSDatabase();

/**
 * Une autre fenêtre de l'application retient l'ancienne version du schéma :
 * la mise à niveau ne peut pas aboutir et TOUTES les requêtes restent en
 * attente indéfiniment (l'onglet Historique affichait « Chargement… » sans
 * jamais rien afficher). On le signale au lieu de laisser l'utilisateur
 * devant un écran figé.
 */
export class DatabaseBlockedError extends Error {}

/** Message lisible pour un échec d'ouverture de la base. */
export function describeDbError(error: unknown): string {
  if (error instanceof DatabaseBlockedError) return error.message;

  const name = (error as { name?: string } | null)?.name;

  if (name === 'QuotaExceededError') {
    return "L'espace de stockage du téléphone est saturé. Libérez de la " +
      "place (photos, autres applications), puis rouvrez l'application.";
  }
  if (name === 'VersionError') {
    return "Cet appareil a déjà ouvert une version plus récente de " +
      "l'application. Fermez complètement l'application (retirez-la des " +
      "applications récentes) puis rouvrez-la.";
  }
  if (name === 'InvalidStateError' || name === 'UnknownError') {
    return "Le navigateur refuse l'accès à la base de données. C'est " +
      "fréquent en navigation privée : ouvrez l'application dans une " +
      "fenêtre normale.";
  }

  const message = (error as { message?: string } | null)?.message;
  return message ? `Erreur : ${message}` : 'Erreur inconnue.';
}

/**
 * Ouvre la base explicitement, au lieu de laisser chaque requête l'ouvrir
 * paresseusement. Un échec devient ainsi un message affiché une fois, et non
 * une exception relancée par useLiveQuery au milieu du rendu — ce qui vidait
 * l'écran, l'application n'ayant aucune frontière d'erreur.
 */
export function openDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const onBlocked = () => {
      reject(new DatabaseBlockedError(
        "L'application est déjà ouverte dans une autre fenêtre ou un autre " +
        "onglet, ce qui empêche la mise à jour de la base.\n\n" +
        "Fermez les autres fenêtres, puis réessayez."
      ));
    };

    db.on('blocked', onBlocked);
    db.open().then(() => resolve(), reject);
  });
}
