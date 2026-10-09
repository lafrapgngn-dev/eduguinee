/* =========================================================================
   backup.ts — SAUVEGARDER / RESTAURER / EXPORTER
   -------------------------------------------------------------------------
   Une sauvegarde est simplement un FICHIER TEXTE au format JSON qui contient
   toutes les données de l'application. On peut :
     - le garder dans la base locale (sauvegarde interne),
     - le télécharger (export),
     - le relire pour tout remettre en place (restauration).

   JSON : format universel de texte structuré, lisible et léger.
   ========================================================================= */

import { STORES, clearStore, countAll, getAll, putMany } from "./db";
import { todayISO, uid } from "./format";
import type { BackupEntry, Database } from "./types";

/** Les tiroirs qui contiennent les données "métier". */
const DATA_STORES = [
  STORES.students,
  STORES.attendance,
  STORES.lateness,
  STORES.permissions,
  STORES.illness,
  STORES.discipline,
  STORES.personnel,
] as const;

export interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  data: Database;
}

/** Lit toutes les données et les met en forme pour un fichier JSON. */
export async function createPayload(): Promise<BackupPayload> {
  const data: Database = {
    students: await getAll(STORES.students),
    attendance: await getAll(STORES.attendance),
    lateness: await getAll(STORES.lateness),
    permissions: await getAll(STORES.permissions),
    illness: await getAll(STORES.illness),
    discipline: await getAll(STORES.discipline),
    personnel: await getAll(STORES.personnel),
  };
  return { app: "SURVEILLANT MANAGER", version: 1, exportedAt: new Date().toISOString(), data };
}

/** Sauvegarde interne : range le JSON dans le tiroir "backups". */
export async function saveBackupLocally(label?: string): Promise<BackupEntry> {
  const payload = await createPayload();
  const json = JSON.stringify(payload);

  const entry: BackupEntry = {
    id: uid("bk_"),
    label: label || `Sauvegarde du ${todayISO()}`,
    date: new Date().toISOString(),
    size: json.length,
    counts: {
      students: payload.data.students.length,
      attendance: payload.data.attendance.length,
      lateness: payload.data.lateness.length,
      permissions: payload.data.permissions.length,
      illness: payload.data.illness.length,
      discipline: payload.data.discipline.length,
      personnel: payload.data.personnel.length,
    },
    data: json,
  };

  await putMany(STORES.backups, [entry]);

  /* On garde les 10 sauvegardes les plus récentes (économie de mémoire). */
  const { deleteRecord } = await import("./db");
  const all = await getAll<BackupEntry>(STORES.backups);
  all.sort((a, b) => b.date.localeCompare(a.date));
  for (const extra of all.slice(10)) await deleteRecord(STORES.backups, extra.id);

  return entry;
}

/** Déclenche le téléchargement d'un fichier sur l'appareil. */
export function downloadFile(filename: string, content: string, type = "application/json"): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Exporte la sauvegarde complète (fichier .json). */
export async function exportBackupFile(): Promise<void> {
  const payload = await createPayload();
  downloadFile(`surveillant-manager-${todayISO()}.json`, JSON.stringify(payload, null, 2));
}

/** Exporte une simple liste au format CSV (ouvrable dans Excel). */
export function exportCsvFile(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(";"), ...rows.map((row) => row.map(escape).join(";"))].join("\n");
  downloadFile(filename, `\ufeff${csv}`, "text/csv;charset=utf-8");
}

const MAX_BACKUP_ITEMS = 5000;
const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePayload(value: unknown): BackupPayload | null {
  if (!isRecord(value)) return null;

  if (typeof value.app !== "string" || typeof value.version !== "number" || typeof value.exportedAt !== "string") {
    return null;
  }

  const data = value.data;
  if (!isRecord(data)) return null;

  const stores = ["students", "attendance", "lateness", "permissions", "illness", "discipline", "personnel"] as const;
  const normalizedData: Database = { students: [], attendance: [], lateness: [], permissions: [], illness: [], discipline: [], personnel: [] };

  let totalItems = 0;
  for (const store of stores) {
    const rows = data[store];
    if (!Array.isArray(rows)) return null;

    if (rows.length > MAX_BACKUP_ITEMS) return null;
    totalItems += rows.length;
    normalizedData[store] = rows as never[];
  }

  if (totalItems === 0 && !Array.isArray(data.students)) return null;
  if (JSON.stringify({ app: value.app, version: value.version, exportedAt: value.exportedAt, data: normalizedData }).length > MAX_PAYLOAD_BYTES) {
    return null;
  }

  return {
    app: value.app,
    version: Number.isFinite(value.version) ? value.version : 1,
    exportedAt: value.exportedAt,
    data: normalizedData,
  };
}

export function isValidPayload(value: unknown): value is BackupPayload {
  return normalizePayload(value) !== null;
}

/** Restaure les données depuis un JSON (remplace les données actuelles). */
export async function restoreFromPayload(payload: BackupPayload): Promise<number> {
  const normalized = normalizePayload(payload);
  if (!normalized) throw new Error("Fichier de sauvegarde invalide.");

  const data = normalized.data;
  const total = data.students.length + data.attendance.length + data.lateness.length + data.permissions.length + data.illness.length + data.discipline.length + data.personnel.length;

  /* 1) On vide les tiroirs. 2) On écrit les données restaurées. */
  for (const store of DATA_STORES) await clearStore(store);
  await putMany(STORES.students, data.students || []);
  await putMany(STORES.attendance, data.attendance || []);
  await putMany(STORES.lateness, data.lateness || []);
  await putMany(STORES.permissions, data.permissions || []);
  await putMany(STORES.illness, data.illness || []);
  await putMany(STORES.discipline, data.discipline || []);
  await putMany(STORES.personnel, data.personnel || []);

  return total;
}

/** Restaure une sauvegarde interne (par son identifiant). */
export async function restoreLocalBackup(id: string): Promise<number> {
  const all = await getAll<BackupEntry>(STORES.backups);
  const entry = all.find((item) => item.id === id);
  if (!entry) throw new Error("Sauvegarde introuvable.");

  try {
    const parsed = JSON.parse(entry.data) as unknown;
    return restoreFromPayload(normalizePayload(parsed) ?? ({} as BackupPayload));
  } catch {
    throw new Error("Sauvegarde corrompue ou non conforme.");
  }
}

/** Supprime une sauvegarde interne. */
export async function deleteLocalBackup(id: string): Promise<void> {
  const all = await getAll<BackupEntry>(STORES.backups);
  const others = all.filter((item) => item.id !== id);
  await clearStore(STORES.backups);
  await putMany(STORES.backups, others);
}

/** Comptage rapide (page Sauvegarde). */
export async function currentCounts(): Promise<Record<string, number>> {
  return countAll();
}
