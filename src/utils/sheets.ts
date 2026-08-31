/**
 * Synchronisation de la liste d'élèves depuis Google Sheets.
 *
 * Aucune clé d'API ni OAuth : on lit l'export CSV public de la feuille
 * (« gviz »), que Google sert avec les en-têtes CORS nécessaires.
 *
 * Contrepartie assumée : cela n'est possible que si la feuille est
 * partagée en « Tous ceux qui disposent du lien » (lecture). Une feuille
 * restreinte renverra une page de connexion au lieu du CSV.
 */

const KEY_URL = 'eps-sheets-url';

/** Extrait l'identifiant (et l'onglet) d'une URL Google Sheets. */
export function parseSheetUrl(url: string): { id: string; gid?: string } | null {
  const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (!id) return null;
  const gid = url.match(/[#&?]gid=([0-9]+)/)?.[1];
  return { id, gid };
}

/** URL d'export CSV correspondant à une feuille. */
export function buildCsvUrl(id: string, gid?: string): string {
  const base = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
  return gid ? `${base}&gid=${gid}` : base;
}

export function getSavedSheetUrl(): string {
  return localStorage.getItem(KEY_URL) || '';
}

export function saveSheetUrl(url: string): void {
  if (url.trim()) localStorage.setItem(KEY_URL, url.trim());
  else localStorage.removeItem(KEY_URL);
}

export class SheetError extends Error {}

/** Télécharge le contenu CSV de la feuille. */
export async function fetchSheetCsv(url: string): Promise<string> {
  const parsed = parseSheetUrl(url);
  if (!parsed) {
    throw new SheetError(
      "Ce lien ne ressemble pas à une feuille Google Sheets.\n\n" +
      "Copiez l'adresse depuis la barre du navigateur, elle contient " +
      "/spreadsheets/d/…"
    );
  }

  let response: Response;
  try {
    response = await fetch(buildCsvUrl(parsed.id, parsed.gid));
  } catch {
    // Échec réseau : pas de connexion, ou feuille non partagée (la
    // redirection vers la page de connexion Google est bloquée par CORS).
    throw new SheetError(
      "Impossible de joindre Google Sheets.\n\n" +
      "Vérifiez votre connexion, puis que la feuille est bien partagée en " +
      "« Tous ceux qui disposent du lien » (lecture)."
    );
  }

  if (!response.ok) {
    throw new SheetError(
      `Google a refusé la lecture (erreur ${response.status}).\n\n` +
      "La feuille est probablement restreinte : partagez-la en " +
      "« Tous ceux qui disposent du lien » (lecture)."
    );
  }

  const text = await response.text();

  // Une feuille non partagée renvoie parfois du HTML (page de connexion)
  // avec un code 200 : on le détecte pour donner un message utile.
  if (text.trimStart().startsWith('<')) {
    throw new SheetError(
      "Google a renvoyé une page de connexion au lieu des données.\n\n" +
      "Partagez la feuille en « Tous ceux qui disposent du lien » (lecture)."
    );
  }

  return text;
}
