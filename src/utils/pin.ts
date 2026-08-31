/**
 * Gestion du code PIN.
 *
 * Le code n'est plus stocké en clair : on conserve uniquement un hash
 * SHA-256 du PIN concaténé à un sel aléatoire propre à l'appareil.
 *
 * À savoir : un PIN à 4 chiffres ne représente que 10 000 combinaisons.
 * Le hash protège contre la lecture opportuniste du localStorage (un collègue
 * qui ouvre les outils de développement), pas contre une attaque hors ligne
 * déterminée. C'est proportionné à l'usage, mais ce n'est pas du chiffrement.
 */

const KEY_HASH = 'eps-tracker-pin-hash';
const KEY_SALT = 'eps-tracker-pin-salt';
const KEY_ATTEMPTS = 'eps-tracker-pin-attempts';
const KEY_LOCKED_UNTIL = 'eps-tracker-pin-locked-until';

/** Ancienne clé : PIN en clair (versions <= 1.5). Sert à la migration. */
const KEY_LEGACY = 'eps-tracker-pin';

export const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 1 minute de blocage après 5 échecs

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getSalt(): string {
  let salt = localStorage.getItem(KEY_SALT);
  if (!salt) {
    salt = crypto.randomUUID();
    localStorage.setItem(KEY_SALT, salt);
  }
  return salt;
}

export async function hashPin(pin: string): Promise<string> {
  return sha256(pin + getSalt());
}

/** Enregistre (ou remplace) le code PIN. */
export async function setPin(pin: string): Promise<void> {
  localStorage.setItem(KEY_HASH, await hashPin(pin));
  localStorage.removeItem(KEY_LEGACY);
  resetAttempts();
}

/**
 * Migration transparente depuis la v1.5 : si un PIN en clair traîne encore,
 * on le convertit en hash au premier lancement et on efface l'original.
 */
export async function migrateLegacyPin(): Promise<void> {
  const legacy = localStorage.getItem(KEY_LEGACY);
  if (legacy && !localStorage.getItem(KEY_HASH)) {
    await setPin(legacy);
  }
  localStorage.removeItem(KEY_LEGACY);
}

export function hasPin(): boolean {
  return localStorage.getItem(KEY_HASH) !== null;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(KEY_HASH);
  if (!stored) return false;
  return (await hashPin(pin)) === stored;
}

/* --- Limitation des tentatives --- */

export function getAttempts(): number {
  return Number(localStorage.getItem(KEY_ATTEMPTS) || 0);
}

export function resetAttempts(): void {
  localStorage.removeItem(KEY_ATTEMPTS);
  localStorage.removeItem(KEY_LOCKED_UNTIL);
}

/** Enregistre un échec et déclenche le blocage si le seuil est atteint. */
export function registerFailedAttempt(): number {
  const attempts = getAttempts() + 1;
  localStorage.setItem(KEY_ATTEMPTS, String(attempts));
  if (attempts >= MAX_ATTEMPTS) {
    localStorage.setItem(KEY_LOCKED_UNTIL, String(Date.now() + LOCKOUT_MS));
  }
  return attempts;
}

/** Secondes restantes avant de pouvoir réessayer (0 si non bloqué). */
export function getLockoutRemaining(): number {
  const until = Number(localStorage.getItem(KEY_LOCKED_UNTIL) || 0);
  if (!until) return 0;
  const remaining = until - Date.now();
  if (remaining <= 0) {
    resetAttempts();
    return 0;
  }
  return Math.ceil(remaining / 1000);
}
