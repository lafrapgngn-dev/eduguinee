/* =========================================================================
   db.ts — LA BASE DE DONNÉES LOCALE (IndexedDB)
   -------------------------------------------------------------------------
   IndexedDB est une base de données qui vit DANS le navigateur / dans
   l'application Android. Elle fonctionne sans Internet et garde les données
   même après fermeture de l'application.

   Vocabulaire :
     - "base"  (database)  : le classeur
     - "store"             : un tiroir du classeur (students, attendance...)
     - "index"             : un tri préparé (ex: les absences d'un élève)
     - "record"            : une fiche rangée dans le tiroir

   Cette couche est GÉNÉRIQUE : une seule fonction `getAll("students")`
   suffit, quel que soit le tiroir. Tout est en "promesses" (async/await)
   pour un code simple à lire.
   ========================================================================= */

import type { Attendance, BackupEntry, Discipline, Illness, Lateness, Permission, PersonnelRecord, Student } from "./types";

const DB_NAME = "surveillant-manager";
const DB_VERSION = 2;

/** Les 9 tiroirs de l'application. */
export const STORES = {
  students: "students",
  attendance: "attendance",
  lateness: "lateness",
  permissions: "permissions",
  illness: "illness",
  discipline: "discipline",
  personnel: "personnel",
  settings: "settings",
  backups: "backups",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

/** Type union de toutes les fiches possibles. */
export type AnyRecord = Student | Attendance | Lateness | Permission | Illness | Discipline | PersonnelRecord | BackupEntry;

/* ------------------------------------------------------------------ */
/* Ouverture (et création) de la base. On ne le fait qu'une seule fois. */
/* ------------------------------------------------------------------ */
let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB n'est pas disponible sur cet appareil."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    /* Création des tiroirs et de leurs index (uniquement à l'installation). */
    request.onupgradeneeded = () => {
      const db = request.result;

      const createStore = (name: StoreName, indexFields: string[] = []) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: "id" });
          indexFields.forEach((field) => store.createIndex(field, field, { unique: false }));
        }
      };

      createStore(STORES.students, ["matricule", "classe", "sexe", "statut"]);
      createStore(STORES.attendance, ["studentId", "date"]);
      createStore(STORES.lateness, ["studentId", "date"]);
      createStore(STORES.permissions, ["studentId", "date"]);
      createStore(STORES.illness, ["studentId", "date"]);
      createStore(STORES.discipline, ["studentId", "date", "gravite"]);
      createStore(STORES.personnel, ["date", "jour", "fonction"]);
      createStore(STORES.settings, []);
      createStore(STORES.backups, ["date"]);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Impossible d'ouvrir la base locale."));
    };
  });

  return dbPromise;
}

/* ------------------------------------------------------------------ */
/* Boîte à outils : 5 opérations suffisent pour toute l'application.   */
/* ------------------------------------------------------------------ */

async function withStore<T>(storeName: StoreName, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = run(transaction.objectStore(storeName));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error ?? new Error("Erreur d'accès à la base."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Opération annulée."));
  });
}

/** Lire toutes les fiches d'un tiroir. */
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const result = await withStore(storeName, "readonly", (store) => store.getAll() as IDBRequest<T[]>);
  return result || [];
}

/** Lire une seule fiche par son identifiant. */
export async function getById<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  return withStore<T | undefined>(storeName, "readonly", (store) => store.get(id) as IDBRequest<T | undefined>);
}

/** Ajouter ou mettre à jour une fiche. */
export async function putRecord<T extends { id: string }>(storeName: StoreName, record: T): Promise<T> {
  await withStore(storeName, "readwrite", (store) => store.put(record));
  return record;
}

/** Ajouter / mettre à jour plusieurs fiches d'un coup (import, restauration). */
export async function putMany<T extends { id: string }>(storeName: StoreName, records: T[]): Promise<void> {
  if (!records.length) return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    records.forEach((record) => store.put(record));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Erreur d'écriture."));
  });
}

/** Supprimer une fiche. */
export async function deleteRecord(storeName: StoreName, id: string): Promise<void> {
  await withStore(storeName, "readwrite", (store) => store.delete(id) as unknown as IDBRequest<undefined>);
}

/** Vider un tiroir (utile avant une restauration). */
export async function clearStore(storeName: StoreName): Promise<void> {
  await withStore(storeName, "readwrite", (store) => store.clear() as unknown as IDBRequest<undefined>);
}

/* ------------------------------------------------------------------ */
/* Réglages : quelques paires clé -> valeur (nom de l'école, PIN...).  */
/* ------------------------------------------------------------------ */

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = db.transaction(STORES.settings, "readonly");
    const request = transaction.objectStore(STORES.settings).get(key);
    request.onsuccess = () => resolve(request.result?.value as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.settings, "readwrite");
    transaction.objectStore(STORES.settings).put({ id: key, value });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/** Nombre d'enregistrements par tiroir : sert à la page Sauvegarde. */
export async function countAll(): Promise<Record<string, number>> {
  const names: StoreName[] = [
    STORES.students,
    STORES.attendance,
    STORES.lateness,
    STORES.permissions,
    STORES.illness,
    STORES.discipline,
    STORES.personnel,
    STORES.backups,
  ];
  const out: Record<string, number> = {};
  for (const name of names) {
    out[name] = await withStore(name, "readonly", (store) => store.count());
  }
  return out;
}

/** Supprimer entièrement la base (bouton "Effacer toutes les données"). */
export async function deleteDatabase(): Promise<void> {
  dbPromise = null;
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
