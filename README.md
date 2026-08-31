# EPS Tracker

Application de gestion des dispenses de sport (EPS), conçue pour être utilisée
au bord du terrain, sur téléphone, sans connexion.

**Toutes les données restent sur l'appareil.** Aucun serveur, aucun compte,
aucun envoi sur Internet.

## Installation sur le téléphone

L'application est une PWA : ouvrez-la dans le navigateur, puis
« Ajouter à l'écran d'accueil ». Elle fonctionne ensuite hors ligne comme une
application native.

## Utilisation

| Onglet | Usage |
|---|---|
| **Aujourd'hui** | Qui est dispensé aujourd'hui, et pour combien de temps encore |
| **Nouveau** | Saisir une dispense : classe → élève → durée → type → justificatif |
| **Historique** | Toutes les dispenses, avec filtres et recherche. Permet d'arrêter ou de supprimer une dispense |
| **Réglages** | Code PIN, sauvegardes, import des élèves, bilan PDF, confidentialité |

### Importer la liste des élèves

Deux sources possibles, avec le même format de colonnes :

```csv
Nom,Prenom,Classe
Dupont,Jean,3ème A
Martin,Sophie,4ème B
```

**Google Sheets** (recommandé) : collez le lien de la feuille dans Réglages,
puis « Synchroniser maintenant ». La feuille reste la référence : vous la
tenez à jour sur ordinateur, et vous resynchronisez depuis le téléphone.

La feuille doit être partagée en « Tous ceux qui disposent du lien »
(lecture) — c'est ce qui permet de la lire sans compte Google ni clé d'API.
Corollaire à assumer : les noms et classes de vos élèves se trouvent alors
derrière une URL publique, quoique indevinable. Les dispenses, elles, ne
quittent jamais l'appareil.

**Fichier CSV** : utile hors connexion, ou si vous préférez garder la feuille
privée (dans ce cas : Fichier → Télécharger → CSV depuis Sheets, puis import
dans l'application). Un modèle est téléchargeable depuis Réglages.

Dans les deux cas l'import est **non destructif** : les élèves déjà connus
voient leur classe mise à jour, les nouveaux sont ajoutés, et personne n'est
jamais supprimé — leurs dispenses passées les référencent. Les élèves
présents dans l'application mais absents de la source sont simplement
signalés dans le bilan d'import.

## ⚠️ Sauvegardes : à lire absolument

Les données vivent dans le navigateur du téléphone. **Vider les données du
navigateur, désinstaller l'application ou changer de téléphone efface tout,
définitivement.** Il n'existe aucune copie ailleurs.

L'application réclame donc une sauvegarde tous les 7 jours via un bandeau
orange. La sauvegarde produit un fichier `eps_backup_AAAA-MM-JJ.json`
contenant tout, justificatifs compris : conservez-le hors du téléphone
(courriel, cloud, ordinateur).

Restauration : Réglages → « Restaurer une sauvegarde ». **La restauration
écrase intégralement les données actuelles.**

## Confidentialité et conservation

Les dispenses contiennent des données de santé de mineurs.

- Le code PIN est stocké sous forme de hash SHA-256 salé, et l'accès est
  bloqué 1 minute après 5 essais infructueux. L'application se reverrouille
  après 3 minutes en arrière-plan.
- Le PIN protège l'accès à l'écran, **pas la base elle-même** : les données
  IndexedDB et les fichiers de sauvegarde ne sont pas chiffrés. Protégez
  l'accès au téléphone (verrouillage système) et ne laissez pas traîner les
  fichiers de sauvegarde.
- Les dispenses de plus de 12 mois sont signalées dans Réglages →
  Confidentialité, qui propose de les purger. Rien n'est jamais supprimé
  automatiquement.
- En cas d'oubli du code PIN, il n'existe pas de récupération : il faut
  réinstaller l'application et restaurer une sauvegarde.

## Déploiement

Le site est hébergé sur Netlify, qui construit automatiquement chaque envoi
sur `main`. La configuration est dans [`netlify.toml`](netlify.toml) :
build `npm run build`, publication de `dist/`.

L'HTTPS fourni par Netlify n'est pas un confort mais une nécessité : le mode
hors ligne (service worker) et le hachage du code PIN (`crypto.subtle`)
refusent tous deux de fonctionner sans contexte sécurisé.

### ⚠️ L'adresse ne se change pas impunément

Les données sont cloisonnées **par adresse**. Changer l'URL du site
(sous-domaine Netlify renommé, passage à un nom de domaine personnel) revient
pour le navigateur à une application neuve : la base repart vide.

Avant tout changement d'adresse : **exportez une sauvegarde**, puis
restaurez-la sur la nouvelle adresse.

## Développement

```bash
npm install
npm run dev
```

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (typecheck + Vite) dans `dist/` |
| `npm run preview` | Prévisualise le build (nécessaire pour tester la PWA) |
| `npm run lint` | ESLint |

### Architecture

- **React 19 + TypeScript + Vite**, PWA via `vite-plugin-pwa`.
- **Pas de routeur** : la navigation est un simple `useState` dans
  [`src/App.tsx`](src/App.tsx), rendu par la barre du bas
  (`components/NavBar.tsx`).
- **Persistance : Dexie (IndexedDB)**, schéma dans [`src/db.ts`](src/db.ts).
  Deux tables, `students` et `exemptions`. Les dates sont des chaînes
  `AAAA-MM-JJ`, ce qui permet de les comparer directement
  (`endDate >= today`).
- **Justificatifs** stockés en `Blob` dans IndexedDB, compressés à 1600 px /
  JPEG 0.7 avant enregistrement (`src/utils/image.ts`) pour que les
  sauvegardes restent exploitables.
- **Styles** en CSS classique dans `src/App.css` (variables CSS + classes) ;
  pas de framework CSS.
