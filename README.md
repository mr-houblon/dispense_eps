# EPS Tracker

Application de gestion des dispenses de sport (EPS), conçue pour être utilisée
au bord du terrain, sur téléphone, sans connexion.

**Les dispenses et les justificatifs ne quittent jamais l'appareil.** Aucun
serveur, aucun compte, aucune donnée de santé envoyée sur Internet.

Seule la liste des élèves (noms et classes) peut être lue depuis une feuille
Google Sheets, si vous activez cette option.

## Installation sur le téléphone

L'application est une PWA : ouvrez-la dans le navigateur, puis
« Ajouter à l'écran d'accueil ». Elle fonctionne ensuite hors ligne comme une
application native.

## Utilisation

| Onglet | Usage |
|---|---|
| **Aujourd'hui** | Qui est dispensé aujourd'hui, et pour combien de temps encore |
| **Nouveau** | Saisir une dispense : élève → durée → type → justificatif. On trouve l'élève en tapant les premières lettres de son nom (accents facultatifs), ou en choisissant sa classe |
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

Dans les deux cas **la source fait autorité** : les élèves déjà connus voient
leur classe mise à jour, les nouveaux sont ajoutés, et ceux qui n'y figurent
plus sont *retirés* — ils disparaissent de l'écran de saisie.

Retiré ne veut pas dire supprimé. Leurs dispenses passées les référencent, et
l'historique doit continuer à les nommer : ils sont conservés en arrière-plan,
listés dans Réglages, et un bouton propose d'effacer définitivement ceux qui
n'ont aucune dispense. Un élève qui réapparaît dans la feuille est
automatiquement réintégré.

Garde-fou : une feuille dont aucune ligne n'est exploitable (mauvais onglet,
en-têtes renommés) ne retire personne — la synchronisation s'interrompt avec
un message.

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
- Si la synchronisation Google Sheets est utilisée, la feuille doit être
  partagée par lien : les noms et classes s'y trouvent donc derrière une URL
  publique quoique indevinable. Aucune donnée de santé n'y figure. Pour
  éviter cette exposition, gardez la feuille restreinte et utilisez l'import
  par fichier CSV.

## Déploiement

Le site est hébergé sur Netlify, qui construit automatiquement chaque envoi
sur `main`. La configuration est dans [`netlify.toml`](netlify.toml) :
build `npm run build`, publication de `dist/`.

L'HTTPS fourni par Netlify n'est pas un confort mais une nécessité : le mode
hors ligne (service worker) et le hachage du code PIN (`crypto.subtle`)
refusent tous deux de fonctionner sans contexte sécurisé.

### Vérifier qu'une mise à jour est bien arrivée

Le numéro de version s'affiche en bas de l'onglet Réglages. C'est le moyen
le plus simple de savoir si l'appareil tourne sur la dernière version ou sur
une copie en cache.

Une PWA installée peut conserver longtemps son ancienne version : elle n'est
presque jamais rechargée, donc le navigateur ne redemande pas le service
worker. [`src/pwa.ts`](src/pwa.ts) force une vérification à chaque retour au
premier plan, et toutes les heures si l'application reste ouverte.

Si une version reste malgré tout bloquée, **fermez complètement
l'application** (retirez-la des applications récentes) et rouvrez-la, deux
fois si nécessaire.

⚠️ **N'effacez jamais « les données du site »** pour forcer une mise à jour :
cela supprimerait IndexedDB, donc les élèves, les dispenses et les
justificatifs. Exportez une sauvegarde d'abord.

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

### Écrans de secours

Deux garde-fous encadrent l'application, faute de quoi une défaillance
d'IndexedDB se traduisait par un écran blanc ou un « Chargement… » sans fin,
sans le moindre message :

- [`DatabaseGate`](src/components/DatabaseGate.tsx) ouvre la base *avant*
  d'afficher quoi que ce soit. Un échec (stockage saturé, navigation privée)
  ou un blocage (l'application ouverte dans une autre fenêtre pendant une
  migration de schéma) devient un message explicite avec un bouton
  « Réessayer ».
- [`ErrorBoundary`](src/components/ErrorBoundary.tsx) rattrape toute erreur de
  rendu — `useLiveQuery` relance l'erreur d'une requête pendant le rendu — et
  affiche le message, la version, et surtout le rappel que les données ne sont
  pas perdues (le réflexe « effacer les données du site » est la seule chose
  qui les détruirait).

### Architecture

- **React 19 + TypeScript + Vite**, PWA via `vite-plugin-pwa`.
- **Pas de routeur** : la navigation est un simple `useState` dans
  [`src/App.tsx`](src/App.tsx), rendu par la barre du bas
  (`components/NavBar.tsx`).
- **Persistance : Dexie (IndexedDB)**, schéma dans [`src/db.ts`](src/db.ts).
  Deux tables, `students` et `exemptions`. Les dates sont des chaînes
  `AAAA-MM-JJ`, ce qui permet de les comparer directement
  (`endDate >= today`). Un élève retiré de la source porte un `archivedAt` ;
  `archivedAt` n'est délibérément **pas** indexé, un index IndexedDB ignorant
  les enregistrements dont la clé est absente — or « non archivé » est
  justement représenté par l'absence de valeur. Même raison pour laquelle
  l'historique lit `db.exemptions.toArray()` puis trie en mémoire plutôt que
  de parcourir l'index `startDate` : un parcours d'index escamote sans bruit
  les dispenses à la date manquante ou malformée.
- **Numéro de version** injecté depuis `package.json` par
  [`vite.config.ts`](vite.config.ts) (`__APP_VERSION__`) : écrit à la main
  dans l'interface, il finissait par mentir sur ce qui tourne réellement.
- **Justificatifs** stockés en `Blob` dans IndexedDB, compressés à 1600 px /
  JPEG 0.7 avant enregistrement (`src/utils/image.ts`) pour que les
  sauvegardes restent exploitables.
- **Styles** en CSS classique dans `src/App.css` (variables CSS + classes) ;
  pas de framework CSS.
