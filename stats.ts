/* =========================================================================
   stats.ts — TOUS LES CALCULS (aucun affichage ici)
   -------------------------------------------------------------------------
   On part des données brutes et on produit des chiffres. Les pages et les
   graphiques se contentent d'afficher le résultat. Ainsi, si une donnée
   change, les chiffres ET les graphiques se recalculent automatiquement.
   ========================================================================= */

import type { Attendance, Database, Discipline, Lateness, Permission, Student } from "./types";
import { lastMonths, shortMonthLabel } from "./format";

/** Dictionnaire id -> élève : évite de chercher 1000 fois dans la liste. */
export function studentMap(students: Student[]): Map<string, Student> {
  return new Map(students.map((student) => [student.id, student]));
}

/** Uniquement les élèves "actifs" (ceux qui comptent dans les totaux). */
export function activeStudents(students: Student[]): Student[] {
  return students.filter((student) => student.statut === "actif");
}

/** Liste triée des classes existantes (pour les menus déroulants). */
export function classList(students: Student[]): string[] {
  return [...new Set(students.map((student) => student.classe).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** Liste triée des niveaux. */
export function levelList(students: Student[]): string[] {
  return [...new Set(students.map((student) => student.niveau).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export interface DashboardStats {
  total: number;
  garcons: number;
  filles: number;
  absentsToday: number;
  retardsToday: number;
  permissionsToday: number;
  maladesToday: number;
  incidents: number;
  sanctions: number;
  tauxPresence: number;
}

/** Statistiques du tableau de bord. */
export function computeDashboard(db: Database, dateISO: string): DashboardStats {
  const students = activeStudents(db.students);
  const total = students.length;
  const garcons = students.filter((student) => student.sexe === "M").length;
  const filles = total - garcons;

  const absentsToday = new Set(db.attendance.filter((row) => row.date === dateISO).map((row) => row.studentId)).size;
  const retardsToday = new Set(db.lateness.filter((row) => row.date === dateISO).map((row) => row.studentId)).size;
  const permissionsToday = new Set(db.permissions.filter((row) => row.date === dateISO).map((row) => row.studentId)).size;
  const maladesToday = new Set(db.illness.filter((row) => row.date === dateISO).map((row) => row.studentId)).size;

  const incidents = db.discipline.filter((row) => row.gravite !== "sanction").length;
  const sanctions = db.discipline.filter((row) => row.gravite === "sanction").length;

  /* Taux de présence = élèves présents / élèves attendus (hors permissions). */
  const attendus = Math.max(total - permissionsToday, 0);
  const tauxPresence = total === 0 ? 100 : Math.round(((attendus - absentsToday) / total) * 1000) / 10;

  return { total, garcons, filles, absentsToday, retardsToday, permissionsToday, maladesToday, incidents, sanctions, tauxPresence };
}

/** Regroupe des lignes par mois : [{ label, absences, retards, incidents }] */
export function monthlySeries(db: Database, months = 8) {
  const keys = lastMonths(months);
  const buckets = new Map(keys.map((key) => [key, { absences: 0, retards: 0, incidents: 0 }]));

  const count = (rows: { date: string }[], field: "absences" | "retards" | "incidents") => {
    rows.forEach((row) => {
      const key = (row.date || "").slice(0, 7);
      const bucket = buckets.get(key);
      if (bucket) bucket[field] += 1;
    });
  };

  count(db.attendance, "absences");
  count(db.lateness, "retards");
  count(db.discipline, "incidents");

  return keys.map((key) => ({ key, label: shortMonthLabel(key), ...buckets.get(key)! }));
}

/** Compte le nombre d'événements par classe. */
function countByClass(students: Student[], rows: { studentId: string }[]): { labels: string[]; values: number[] } {
  const map = studentMap(students);
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const student = map.get(row.studentId);
    if (!student) return;
    totals.set(student.classe, (totals.get(student.classe) || 0) + 1);
  });

  const labels = [...totals.keys()].sort((a, b) => a.localeCompare(b));
  return { labels, values: labels.map((label) => totals.get(label) || 0) };
}

export function absencesByClass(db: Database) {
  return countByClass(db.students, db.attendance);
}
export function retardsByClass(db: Database) {
  return countByClass(db.students, db.lateness);
}
export function incidentsByType(db: Database) {
  const totals = new Map<string, number>();
  db.discipline.forEach((row) => totals.set(row.type || "Non précisé", (totals.get(row.type || "Non précisé") || 0) + 1));
  const labels = [...totals.keys()].sort((a, b) => (totals.get(b) || 0) - (totals.get(a) || 0));
  return { labels, values: labels.map((label) => totals.get(label) || 0) };
}

/** Répartition garçons / filles. */
export function genderSplit(students: Student[]) {
  const garcons = students.filter((student) => student.sexe === "M").length;
  return { labels: ["Garçons", "Filles"], values: [garcons, students.length - garcons] };
}

/** Nombres d'événements par niveau de gravité disciplinaire. */
export function disciplineByGravity(db: Database) {
  const order = ["observation", "avertissement", "incident", "sanction"] as const;
  const totals = new Map(order.map((key) => [key, 0]));
  db.discipline.forEach((row) => {
    if (totals.has(row.gravite)) totals.set(row.gravite, (totals.get(row.gravite) || 0) + 1);
  });
  return { labels: order.map((key) => key), values: order.map((key) => totals.get(key) || 0) };
}

/** Résumé individuel d'un élève : utilisé par la fiche. */
export interface StudentSummary {
  absences: number;
  absencesJustifiees: number;
  retards: number;
  permissions: number;
  maladies: number;
  incidents: number;
  sanctions: number;
}

export function studentSummary(db: Database, studentId: string): StudentSummary {
  const absences = db.attendance.filter((row) => row.studentId === studentId);
  const discipline = db.discipline.filter((row) => row.studentId === studentId);
  return {
    absences: absences.length,
    absencesJustifiees: absences.filter((row) => row.justifiee).length,
    retards: db.lateness.filter((row) => row.studentId === studentId).length,
    permissions: db.permissions.filter((row) => row.studentId === studentId).length,
    maladies: db.illness.filter((row) => row.studentId === studentId).length,
    incidents: discipline.filter((row) => row.gravite !== "sanction").length,
    sanctions: discipline.filter((row) => row.gravite === "sanction").length,
  };
}

/** Historique complet d'un élève, trié du plus récent au plus ancien. */
export type HistoryRow = { id: string; date: string; type: string; motif: string; observation: string; gravite?: string };

export function studentHistory(db: Database, studentId: string): HistoryRow[] {
  const rows: HistoryRow[] = [];

  db.attendance
    .filter((row) => row.studentId === studentId)
    .forEach((row: Attendance) => rows.push({ id: row.id, date: row.date, type: "Absence", motif: row.motif, observation: row.observation }));

  db.lateness
    .filter((row) => row.studentId === studentId)
    .forEach((row: Lateness) => rows.push({ id: row.id, date: row.date, type: "Retard", motif: `${row.heure} — ${row.motif}`, observation: row.observation }));

  db.permissions
    .filter((row) => row.studentId === studentId)
    .forEach((row: Permission) =>
      rows.push({ id: row.id, date: row.date, type: "Permission", motif: `${row.heureSortie} → ${row.heureRetour} — ${row.motif}`, observation: row.observation })
    );

  db.illness
    .filter((row) => row.studentId === studentId)
    .forEach((row) => rows.push({ id: row.id, date: row.date, type: "Maladie", motif: row.motif, observation: row.observation }));

  db.discipline
    .filter((row) => row.studentId === studentId)
    .forEach((row: Discipline) =>
      rows.push({ id: row.id, date: row.date, type: "Discipline", motif: `${row.type} — ${row.description}`, observation: row.observation, gravite: row.gravite })
    );

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

/** Les élèves les plus concernés (tableau "à surveiller" du dashboard). */
export function topAbsentStudents(db: Database, limit = 5) {
  const map = studentMap(db.students);
  const totals = new Map<string, number>();
  db.attendance.forEach((row) => totals.set(row.studentId, (totals.get(row.studentId) || 0) + 1));
  return [...totals.entries()]
    .map(([studentId, count]) => ({ student: map.get(studentId), count }))
    .filter((row) => row.student)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
