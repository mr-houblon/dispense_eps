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

Format CSV attendu, avec la ligne d'en-tête :

```csv
Nom,Prenom,Classe
Dupont,Jean,3ème A
Martin,Sophie,4ème B
```

Un modèle est téléchargeable depuis l'onglet Réglages. Le ré-import est
non destructif : les élèves déjà connus voient simplement leur classe mise à
jour (utile en début d'année).

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
