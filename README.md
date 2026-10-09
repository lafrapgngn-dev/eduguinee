# 🎓 SURVEILLANT MANAGER

Application **offline-first** pour surveillant / conseiller éducatif.
Elle fonctionne **100 % sans Internet** : les données sont enregistrées sur l'appareil (IndexedDB), les rapports PDF sont générés sur l'appareil (jsPDF), les graphiques sont dessinés localement (Chart.js).

---

## 1. Architecture du projet

```
surveillant-manager/
│
├── index.html                     ← page unique + liens PWA (FICHIER MODIFIÉ)
├── public/
│   ├── manifest.webmanifest       ← identité de l'application installable
│   ├── sw.js                      ← Service Worker (mode hors connexion)
│   └── icons/icon-512.png         ← icône de l'application
│
├── src/
│   ├── main.tsx                   ← point d'entrée + enregistrement du SW
│   ├── index.css                  ← styles globaux + mode sombre
│   ├── App.tsx                    ← navigation entre les écrans
│   │
│   ├── lib/                       ← "cerveau" sans interface
│   │   ├── types.ts               ← forme des données (élève, absence…)
│   │   ├── db.ts                  ← IndexedDB : 8 stores + index
│   │   ├── format.ts              ← dates, textes, identifiants
│   │   ├── validate.ts            ← contrôle des saisies (sécurité)
│   │   ├── stats.ts               ← tous les calculs
│   │   ├── search.ts              ← moteur de recherche avancée
│   │   ├── pdf.ts                 ← générateur de rapports PDF
│   │   ├── backup.ts              ← sauvegarde / restauration / export
│   │   └── seed.ts                ← données de démonstration
│   │
│   ├── store/
│   │   └── AppStore.tsx           ← données + actions + notifications
│   │
│   ├── components/
│   │   ├── ui.tsx                 ← boutons, cartes, modales, tableaux…
│   │   ├── Layout.tsx             ← barre haute, menu, barre Android
│   │   ├── nav.ts                 ← liste des écrans
│   │   ├── ChartCard.tsx          ← un graphique Chart.js
│   │   ├── EventModule.tsx        ← brique commune des 5 modules
│   │   └── StudentSheet.tsx       ← fiche individuelle d'un élève
│   │
│   └── pages/
│       ├── Dashboard.tsx          🏠 tableau de bord + graphiques
│       ├── Students.tsx           👨‍🎓 gestion des élèves
│       ├── Attendance.tsx         📋 absences
│       ├── Lateness.tsx           ⏰ retards
│       ├── Permissions.tsx        📝 permissions
│       ├── Illness.tsx            🩺 maladies
│       ├── Discipline.tsx         ⚠️ discipline & sanctions
│       ├── Search.tsx             🔍 recherche avancée
│       ├── Statistics.tsx         📊 statistiques détaillées
│       ├── Reports.tsx            📄 rapports PDF
│       ├── Backup.tsx             💾 sauvegarde / restauration
│       └── Settings.tsx           ⚙️ paramètres
│
└── README.md
```

---

## 2. Base de données (IndexedDB)

Base unique `surveillant-manager`, 8 tiroirs (*stores*) :

| Store         | Contenu                        | Index                              |
| ------------- | ------------------------------ | ---------------------------------- |
| `students`    | les élèves                     | matricule, classe, sexe, statut     |
| `attendance`  | les absences                   | studentId, date                     |
| `lateness`    | les retards                    | studentId, date                     |
| `permissions` | les sorties autorisées         | studentId, date                     |
| `illness`     | les cas de maladie             | studentId, date                     |
| `discipline`  | incidents et sanctions         | studentId, date, gravite            |
| `settings`    | réglages (école, thème, PIN)   | clé                                 |
| `backups`     | sauvegardes JSON internes      | date                                |

Relations par identifiant :

```
student.id ──┬── attendance.studentId
             ├── lateness.studentId
             ├── permissions.studentId
             ├── illness.studentId
             └── discipline.studentId
```

Supprimer un élève supprime automatiquement tout son historique.

---

## 3. Comment ça fonctionne (en 4 phrases)

1. Au démarrage, `AppStore` lit les 6 tiroirs et place les données dans un **contexte React** partagé par tous les écrans.
2. Chaque action (ajouter, modifier, supprimer) écrit **d'abord** dans IndexedDB, **puis** met à jour la mémoire → l'écran se rafraîchit instantanément.
3. Les statistiques et les graphiques sont recalculés à chaque changement (`lib/stats.ts`).
4. Le **Service Worker** garde l'application en cache : même sans réseau, elle démarre et fonctionne.

---

## 4. Tester sur un ordinateur

```bash
npm install
npm run dev        # ouvre http://localhost:5173
```

- Au premier lancement, un **jeu de démonstration** (72 élèves, absences, retards…) est créé automatiquement.
- Testez le hors-ligne : ouvrez les outils de développement (F12) → onglet *Network* → **Offline**, puis rechargez la page : tout fonctionne.

## 5. Tester sur Android

1. Hébergez le dossier `dist/` (après `npm run build`) sur un serveur **HTTPS** (Netlify, Vercel, GitHub Pages…) **ou** servez-le en local sur le même Wi-Fi.
2. Ouvrez l'adresse dans **Chrome** sur le téléphone.
3. Menu Chrome (⋮) → **Ajouter à l'écran d'accueil**.
4. L'application s'ouvre en plein écran comme une vraie appli.
5. Coupez le **Wi-Fi** et les **données mobiles** : tout reste utilisable.

> ⚠️ Un Service Worker exige HTTPS (ou `localhost`). En ouvrant directement un fichier `file://`, le mode hors connexion PWA ne s'activera pas, mais l'application et la base de données fonctionnent quand même.

---

## 6. Obtenir un APK Android (Capacitor) — étape suivante

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "SURVEILLANT MANAGER" com.ecole.surveillant --web-dir=dist
npm run build
npx cap add android
npx cap copy
npx cap open android      # ouvre Android Studio → Build > Build APK
```

Pensez à désactiver le Service Worker dans le build Capacitor (l'application est déjà locale dans la WebView) et à conserver les permissions de stockage par défaut, suffisantes pour IndexedDB.

---

## 7. Sécurité appliquée

- Validation de **tous** les champs (`lib/validate.ts`) : obligatoires, longueurs, formats, matricule unique.
- Aucun `innerHTML`, aucun `eval` : React échappe le texte automatiquement (`textContent`).
- Les suppressions demandent toujours une **confirmation**.
- Le code PIN est stocké sous forme d'**empreinte**, jamais en clair.
- Aucune donnée médicale sensible n'est demandée dans le module Maladies.
- Les données restent sur l'appareil : aucun envoi réseau.

---

## 8. Étapes de construction (récapitulatif)

| Étape | Contenu                                        | Fichiers |
| ----- | ---------------------------------------------- | -------- |
| 1     | Architecture + interface générale              | `index.html`, `Layout.tsx`, `nav.ts`, `ui.tsx` |
| 2     | Tableau de bord                                | `Dashboard.tsx` |
| 3     | Base IndexedDB                                 | `db.ts`, `types.ts` |
| 4     | Gestion des élèves                             | `Students.tsx`, `StudentSheet.tsx` |
| 5     | Absences & retards                             | `EventModule.tsx`, `Attendance.tsx`, `Lateness.tsx` |
| 6     | Permissions & maladies                         | `Permissions.tsx`, `Illness.tsx` |
| 7     | Discipline                                     | `Discipline.tsx` |
| 8     | Recherche avancée                              | `search.ts`, `Search.tsx` |
| 9     | Statistiques & graphiques                      | `stats.ts`, `ChartCard.tsx`, `Statistics.tsx` |
| 10    | Export PDF                                     | `pdf.ts`, `Reports.tsx` |
| 11    | Sauvegarde / restauration                      | `backup.ts`, `Backup.tsx` |
| 12    | PWA + hors connexion                           | `sw.js`, `manifest.webmanifest`, `main.tsx` |
| 13    | Sécurité et tests                              | `validate.ts`, confirmations de suppression |
| 14    | Préparation APK Android                        | section 6 ci-dessus |
