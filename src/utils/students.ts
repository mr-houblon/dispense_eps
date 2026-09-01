import type { Student } from '../db';

/**
 * Aides autour de la liste d'élèves.
 *
 * Deux notions distinctes :
 *  - un élève *actif* figure dans la source (feuille Google Sheets ou CSV) ;
 *    lui seul apparaît dans les listes de saisie ;
 *  - un élève *archivé* en a été retiré, mais reste en base car ses dispenses
 *    passées le référencent : l'historique doit continuer à le nommer.
 */

export const isArchived = (s: Student) => Boolean(s.archivedAt);
export const isActive = (s: Student) => !s.archivedAt;

/** Clé d'identité d'un élève, insensible à la casse. */
export const studentKey = (lastName: string, firstName: string) =>
  `${lastName.trim().toLowerCase()}|${firstName.trim().toLowerCase()}`;

/** « DUPONT Jean » */
export const fullName = (s: Student) => `${s.lastName.toUpperCase()} ${s.firstName}`;

/**
 * Normalise pour la recherche : minuscules, sans accents.
 * Sans cela, chercher « chloe » ne trouverait jamais « Chloé », et taper les
 * accents au doigt sur un clavier de téléphone est un supplice.
 */
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * L'élève correspond-il à la recherche ? Chaque mot saisi doit se retrouver
 * dans le nom, le prénom ou la classe : « dup 3 » trouve Dupont en 3ème A.
 */
export function matchesQuery(s: Student, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const haystack = normalize(`${s.lastName} ${s.firstName} ${s.classe}`);
  return words.every((w) => haystack.includes(w));
}

/** Tri usuel : par nom, puis prénom. */
export const byName = (a: Student, b: Student) =>
  a.lastName.localeCompare(b.lastName, 'fr') ||
  a.firstName.localeCompare(b.firstName, 'fr');

/**
 * Tri des classes. Un tri alphabétique brut place « 10ème » avant « 3ème » ;
 * on compare donc le nombre en tête quand il y en a un.
 */
export function byClasse(a: string, b: string): number {
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
    return numA - numB;
  }
  return a.localeCompare(b, 'fr', { numeric: true });
}
