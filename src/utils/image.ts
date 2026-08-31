/**
 * Compression des justificatifs avant stockage dans IndexedDB.
 *
 * Une photo prise avec un téléphone récent pèse 3 à 5 Mo. Multipliée par
 * quelques dizaines de dispenses, la base devient énorme et le fichier de
 * sauvegarde JSON (qui encode les blobs en base64, +33 %) devient inutilisable.
 * On redimensionne donc à 1600 px de côté maximum en JPEG qualité 0.7 :
 * un mot de médecin reste parfaitement lisible pour ~200 Ko.
 */

const MAX_DIMENSION = 1600;
const QUALITY = 0.7;

export async function compressImage(file: File): Promise<Blob> {
  // Les PDF et les formats non gérables sont stockés tels quels.
  if (!file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY)
    );

    // Si la compression n'apporte rien (petite image déjà optimisée),
    // on garde l'original.
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } catch {
    // En cas d'échec (format exotique, navigateur ancien), on n'empêche
    // jamais l'enregistrement de la dispense : on stocke l'original.
    return file;
  }
}

/** Formate une taille en octets pour l'affichage. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
