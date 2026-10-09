/* =========================================================================
   AppStore.tsx — LE CERVEAU DE L'APPLICATION
   -------------------------------------------------------------------------
   React "contexte" : un objet partagé par tous les écrans. Il contient :
     - les données lues dans IndexedDB,
     - les réglages (nom de l'école, mode sombre...),
     - les actions (ajouter, modifier, supprimer),
     - les notifications (petits messages de succès ou d'erreur),
     - l'état de connexion (en ligne / hors ligne).

   Avantage : chaque page reste courte et lisible.
   ========================================================================= */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  STORES,
  clearStore,
  deleteRecord,
  getAll,
  getSetting,
  putRecord,
  setSetting,
} from "../lib/db";
import { installDemoData } from "../lib/seed";
import { uid } from "../lib/format";
import type { AppSettings, Attendance, BackupEntry, Database, Discipline, Illness, Lateness, Permission, PersonnelRecord, Student } from "../lib/types";

/* Clés des tiroirs "événements" (même logique pour tous). */
export type EventStore = "attendance" | "lateness" | "permissions" | "illness" | "discipline" | "personnel";

const DEFAULT_SETTINGS: AppSettings = {
  schoolName: "GROUPE SCOLAIRE LA RÉUSSITE",
  schoolMotto: "Discipline · Travail · Réussite",
  schoolYear: "2025-2026",
  surveillant: "M. le Surveillant Général",
  darkMode: false,
};

export type ToastType = "success" | "error" | "info";
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface AppContextValue {
  ready: boolean; // les données sont-elles chargées ?
  db: Database;
  settings: AppSettings;
  online: boolean; // connexion Internet disponible ?
  toasts: Toast[];
  notify: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
  saveSettings: (partial: Partial<AppSettings>) => Promise<void>;
  saveStudent: (student: Student) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  saveEvent: <T extends { id: string }>(store: EventStore, record: T) => Promise<void>;
  deleteEvent: (store: EventStore, id: string) => Promise<void>;
  saveBackups: (rows: BackupEntry[]) => Promise<void>;
  deleteBackup: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const EMPTY_DB: Database = { students: [], attendance: [], lateness: [], permissions: [], illness: [], discipline: [], personnel: [] };

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<Database>(EMPTY_DB);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  /* -------------------- Notifications -------------------- */
  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: ToastType = "success") => {
      const toast: Toast = { id: uid("ts_"), message, type };
      setToasts((current) => [...current.slice(-2), toast]);
      const timer = window.setTimeout(() => dismissToast(toast.id), 3200);
      timers.current.push(timer);
    },
    [dismissToast]
  );

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  /* -------------------- Chargement initial -------------------- */
  const loadAll = useCallback(async (): Promise<Database> => {
    const [students, attendance, lateness, permissions, illness, discipline, personnel] = await Promise.all([
      getAll<Student>(STORES.students),
      getAll<Attendance>(STORES.attendance),
      getAll<Lateness>(STORES.lateness),
      getAll<Permission>(STORES.permissions),
      getAll<Illness>(STORES.illness),
      getAll<Discipline>(STORES.discipline),
      getAll<PersonnelRecord>(STORES.personnel),
    ]);
    return { students, attendance, lateness, permissions, illness, discipline, personnel };
  }, []);

  const reload = useCallback(async () => {
    setDb(await loadAll());
  }, [loadAll]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const savedSchool = await getSetting<string>("schoolName");
        if (savedSchool === undefined) {
          /* Premier lancement : on propose des données de démonstration. */
          await installDemoData();
          await setSetting("schoolName", DEFAULT_SETTINGS.schoolName);
          await setSetting("seedInstalled", true);
        }

        const partial: Partial<AppSettings> = {};
        for (const key of ["schoolName", "schoolMotto", "schoolYear", "surveillant", "logo", "pin", "darkMode"] as const) {
          const value = await getSetting<AppSettings[typeof key]>(key);
          if (value !== undefined) (partial as Record<string, unknown>)[key] = value;
        }

        if (cancelled) return;
        setSettings((current) => ({ ...current, ...partial }));
        setDb(await loadAll());
      } catch (error) {
        console.error(error);
        if (!cancelled) notify("Impossible de lire la base locale.", "error");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAll, notify]);

  /* -------------------- Mode sombre -------------------- */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", settings.darkMode ? "#0b1220" : "#1d4ed8");
  }, [settings.darkMode]);

  /* -------------------- Connexion -------------------- */
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /* -------------------- Actions -------------------- */
  const saveSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      setSettings((current) => ({ ...current, ...partial }));
      for (const [key, value] of Object.entries(partial)) {
        if (value === undefined) continue;
        await setSetting(key, value);
      }
      notify("Paramètres enregistrés.");
    },
    [notify]
  );

  const saveStudent = useCallback(
    async (student: Student) => {
      const record = { ...student, updatedAt: new Date().toISOString() };
      await putRecord(STORES.students, record);
      setDb((current) => {
        const exists = current.students.some((item) => item.id === record.id);
        return {
          ...current,
          students: exists ? current.students.map((item) => (item.id === record.id ? record : item)) : [...current.students, record],
        };
      });
      notify("Élève enregistré.");
    },
    [notify]
  );

  const deleteStudent = useCallback(
    async (id: string) => {
      /* On supprime l'élève ET tous ses événements (propreté des données). */
      const eventStores: EventStore[] = ["attendance", "lateness", "permissions", "illness", "discipline"];
      await deleteRecord(STORES.students, id);

      for (const store of eventStores) {
        const rows = await getAll<{ id: string; studentId: string }>(STORES[store]);
        for (const row of rows) if (row.studentId === id) await deleteRecord(STORES[store], row.id);
      }

      setDb((current) => ({
        students: current.students.filter((student) => student.id !== id),
        attendance: current.attendance.filter((row) => row.studentId !== id),
        lateness: current.lateness.filter((row) => row.studentId !== id),
        permissions: current.permissions.filter((row) => row.studentId !== id),
        illness: current.illness.filter((row) => row.studentId !== id),
        discipline: current.discipline.filter((row) => row.studentId !== id),
      }));
      notify("Élève et historique supprimés.", "info");
    },
    [notify]
  );

  const saveEvent = useCallback(
    async <T extends { id: string }>(store: EventStore, record: T) => {
      await putRecord(STORES[store], record);
      setDb((current) => {
        const rows = current[store] as unknown as { id: string }[];
        const exists = rows.some((row) => row.id === record.id);
        const updated = exists ? rows.map((row) => (row.id === record.id ? record : row)) : [...rows, record];
        return { ...current, [store]: updated } as Database;
      });
      notify("Enregistré.");
    },
    [notify]
  );

  const deleteEvent = useCallback(
    async (store: EventStore, id: string) => {
      await deleteRecord(STORES[store], id);
      setDb((current) => ({ ...current, [store]: (current[store] as unknown as { id: string }[]).filter((row) => row.id !== id) }) as Database);
      notify("Supprimé.", "info");
    },
    [notify]
  );

  const saveBackups = useCallback(async (rows: BackupEntry[]) => {
    for (const row of rows) await putRecord(STORES.backups, row);
  }, []);

  const deleteBackup = useCallback(
    async (id: string) => {
      const rows = await getAll<BackupEntry>(STORES.backups);
      await clearStore(STORES.backups);
      for (const row of rows) if (row.id !== id) await putRecord(STORES.backups, row);
      notify(`${rows.length - 1} sauvegarde(s) conservée(s).`, "info");
    },
    [notify]
  );

  const resetAll = useCallback(async () => {
    await installDemoData();
    await reload();
    notify("Données de démonstration reinstallées.", "info");
  }, [notify, reload]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      db,
      settings,
      online,
      toasts,
      notify,
      dismissToast,
      saveSettings,
      saveStudent,
      deleteStudent,
      saveEvent,
      deleteEvent,
      saveBackups,
      deleteBackup,
      reload,
      resetAll,
    }),
    [ready, db, settings, online, toasts, notify, dismissToast, saveSettings, saveStudent, deleteStudent, saveEvent, deleteEvent, saveBackups, deleteBackup, reload, resetAll]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Petit crochet pratique : `const { db, notify } = useApp();` */
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp doit être utilisé à l'intérieur de <AppProvider>.");
  return context;
}
