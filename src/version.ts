/**
 * Version affichée dans Réglages et dans les écrans d'erreur.
 * Lue depuis package.json au moment du build (voir vite.config.ts) pour
 * qu'elle ne puisse plus diverger du numéro publié.
 */
export const APP_VERSION: string = __APP_VERSION__;
