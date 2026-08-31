import { db } from '../db';

/**
 * Conservation des données (RGPD).
 *
 * Les dispenses contiennent des données de santé de mineurs : elles ne
 * doivent pas être conservées indéfiniment. On retient 12 mois, ce qui
 * couvre une année scolaire complète, puis on PROPOSE la suppression.
 * Rien n'est jamais effacé sans accord explicite de l'utilisateur.
 */

export const RETENTION_MONTHS = 12;

/** Date limite : tout ce qui s'est terminé avant est considéré comme périmé. */
export function getRetentionCutoff(): string {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  return cutoff.toISOString().split('T')[0];
}

/** Compte les dispenses terminées depuis plus de 12 mois. */
export async function countExpired(): Promise<number> {
  const cutoff = getRetentionCutoff();
  const all = await db.exemptions.toArray();
  return all.filter((ex) => ex.endDate < cutoff).length;
}

/** Supprime les dispenses périmées. Renvoie le nombre d'éléments effacés. */
export async function purgeExpired(): Promise<number> {
  const cutoff = getRetentionCutoff();
  const all = await db.exemptions.toArray();
  const expiredIds = all
    .filter((ex) => ex.endDate < cutoff)
    .map((ex) => ex.id!)
    .filter((id) => id !== undefined);

  if (expiredIds.length > 0) {
    await db.exemptions.bulkDelete(expiredIds);
  }
  return expiredIds.length;
}
