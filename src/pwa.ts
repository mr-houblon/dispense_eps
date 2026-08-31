import { registerSW } from 'virtual:pwa-register';

/**
 * Mise à jour de l'application installée.
 *
 * Une PWA ajoutée à l'écran d'accueil n'est presque jamais « rechargée » :
 * on la met en arrière-plan, on y revient, et le navigateur ne redemande
 * le service worker que rarement. Résultat, une nouvelle version peut
 * rester invisible pendant des jours, et la seule échappatoire évidente
 * pour l'utilisateur — vider les données du site — détruirait toute la
 * base (élèves, dispenses, justificatifs).
 *
 * On force donc une vérification à chaque retour au premier plan, et
 * toutes les heures si l'application reste ouverte.
 */

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

export function setupPwaUpdates() {
  registerSW({
    immediate: true,

    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        // Inutile d'interroger le réseau hors connexion : l'application
        // est justement conçue pour fonctionner sans.
        if (navigator.onLine) registration.update();
      };

      // Au retour au premier plan : c'est le bon moment pour basculer,
      // l'utilisateur n'est pas en train de remplir un formulaire.
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkForUpdate();
      });

      window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
    },
  });
}
