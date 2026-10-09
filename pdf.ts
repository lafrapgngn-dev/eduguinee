/* =========================================================================
   pdf.ts — GÉNÉRATION DES RAPPORTS PDF
   -------------------------------------------------------------------------
   Deux outils sont utilisés :
     - jsPDF        : crée le document PDF (pages, texte, lignes, images)
     - jspdf-autotable : dessine des tableaux propres automatiquement

   Chaque rapport suit le même plan professionnel :
     en-tête (école + logo) -> titre -> période -> tableau -> statistiques
     -> pied de page (date de génération).
   ========================================================================= */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatNumber } from "./format";
import type { AppSettings, Database, Student } from "./types";
import { GRAVITY_LABELS } from "./types";
import { studentHistory, studentMap, studentSummary, computeDashboard } from "./stats";
import { fullName } from "./format";

const BLUE: [number, number, number] = [29, 78, 216];
const DARK: [number, number, number] = [30, 41, 59];
const GREY: [number, number, number] = [100, 116, 139];

export type ReportKind =
  | "students"
  | "absences"
  | "lateness"
  | "permissions"
  | "illness"
  | "discipline"
  | "personnel"
  | "monthly"
  | "student"
  | "general";

export const REPORT_LABELS: Record<ReportKind, string> = {
  students: "Liste des élèves",
  absences: "Liste des absents",
  lateness: "Liste des retardataires",
  permissions: "Liste des permissions",
  illness: "Liste des cas de maladie",
  discipline: "Rapport disciplinaire",
  personnel: "Registre du personnel",
  monthly: "Statistiques mensuelles",
  student: "Fiche individuelle de l'élève",
  general: "Rapport général",
};

export interface ReportOptions {
  kind: ReportKind;
  db: Database;
  settings: AppSettings;
  periode: string;
  dateDebut?: string;
  dateFin?: string;
  studentId?: string;
  classe?: string;
}

/* ------------------------------------------------------------------ */
/* En-tête + pied de page communs à tous les rapports.                 */
/* ------------------------------------------------------------------ */
function drawHeader(doc: jsPDF, options: ReportOptions, title: string, subtitle: string): number {
  const { settings } = options;
  const width = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BLUE);
  doc.rect(0, 0, width, 26, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(settings.schoolName || "ÉTABLISSEMENT SCOLAIRE", 12, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(settings.schoolMotto || "Service de surveillance générale", 12, 19);
  doc.text(`Année scolaire : ${settings.schoolYear || "—"}`, width - 12, 12, { align: "right" });
  doc.text(`Surveillant : ${settings.surveillant || "—"}`, width - 12, 19, { align: "right" });

  /* Logo facultatif (choisi dans les paramètres). */
  if (settings.logo?.startsWith("data:image")) {
    try {
      doc.addImage(settings.logo, "PNG", width - 30, 30, 18, 18);
    } catch {
      /* logo illisible : on continue sans lui */
    }
  }

  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, 12, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text(subtitle, 12, 46);

  return 54; /* position Y de départ du contenu */
}

function drawFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(
      `Généré le ${new Date().toLocaleString("fr-FR")} — SURVEILLANT MANAGER (document local)`,
      12,
      height - 8
    );
    doc.text(`Page ${page} / ${pageCount}`, width - 12, height - 8, { align: "right" });
  }
}

/* ------------------------------------------------------------------ */
/* Point d'entrée : construit le PDF et le télécharge.                 */
/* ------------------------------------------------------------------ */
export function buildReport(options: ReportOptions): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const title = REPORT_LABELS[options.kind];
  const periode = options.periode || "Période : toutes dates";
  const startY = drawHeader(doc, options, title, periode);

  switch (options.kind) {
    case "students":
      studentsTable(doc, options, startY);
      break;
    case "absences":
      absencesTable(doc, options, startY);
      break;
    case "lateness":
      latenessTable(doc, options, startY);
      break;
    case "permissions":
      permissionsTable(doc, options, startY);
      break;
    case "illness":
      illnessTable(doc, options, startY);
      break;
    case "discipline":
      disciplineTable(doc, options, startY);
      break;
    case "personnel":
      personnelTable(doc, options, startY);
      break;
    case "monthly":
      monthlyReport(doc, options, startY);
      break;
    case "student":
      studentSheet(doc, options, startY);
      break;
    case "general":
      generalReport(doc, options, startY);
      break;
  }

  drawFooter(doc);
  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ----------------------------- helpers ---------------------------- */
function inRange(dateISO: string, options: ReportOptions): boolean {
  if (options.dateDebut && dateISO < options.dateDebut) return false;
  if (options.dateFin && dateISO > options.dateFin) return false;
  return true;
}

function filteredStudents(options: ReportOptions): Student[] {
  const students = [...options.db.students].sort((a, b) => a.nom.localeCompare(b.nom));
  return options.classe ? students.filter((student) => student.classe === options.classe) : students;
}

const baseTable = { theme: "grid" as const, styles: { fontSize: 8.5, cellPadding: 1.6 }, headStyles: { fillColor: BLUE, textColor: 255, fontSize: 8.5 } };

/* --------------------------- LES RAPPORTS -------------------------- */
function studentsTable(doc: jsPDF, options: ReportOptions, startY: number) {
  const students = filteredStudents(options);
  autoTable(doc, {
    ...baseTable,
    startY,
    head: [["#", "Matricule", "Nom & prénom", "Sexe", "Naissance", "Classe", "Parent", "Téléphone"]],
    body: students.map((student, index) => [
      index + 1,
      student.matricule,
      fullName(student),
      student.sexe,
      formatDate(student.dateNaissance),
      student.classe,
      student.parentNom || "—",
      student.parentTelephone || "—",
    ]),
  });
  const end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`Total : ${formatNumber(students.length)} élèves — Garçons : ${students.filter((s) => s.sexe === "M").length} — Filles : ${
    students.filter((s) => s.sexe === "F").length
  }`, 12, end + 8);
}

function absencesTable(doc: jsPDF, options: ReportOptions, startY: number) {
  const map = studentMap(options.db.students);
  const rows = options.db.attendance.filter((row) => inRange(row.date, options)).sort((a, b) => b.date.localeCompare(a.date));
  autoTable(doc, {
    ...baseTable,
    startY,
    head: [["Date", "Matricule", "Élève", "Classe", "Motif", "Justifiée"]],
    body: rows.map((row) => {
      const student = map.get(row.studentId);
      return [formatDate(row.date), student?.matricule ?? "—", fullName(student), student?.classe ?? "—", row.motif || "—", row.justifiee ? "Oui" : "Non"];
    }),
  });
  const end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(9);
  doc.text(`Total : ${formatNumber(rows.length)} absences — Justifiées : ${rows.filter((row) => row.justifiee).length}`, 12, end + 8);
}

function latenessTable(doc: jsPDF, options: ReportOptions, startY: number) {
  const map = studentMap(options.db.students);
  const rows = options.db.lateness.filter((row) => inRange(row.date, options)).sort((a, b) => b.date.localeCompare(a.date));
  autoTable(doc, {
    ...baseTable,
    startY,
    head: [["Date", "Heure", "Élève", "Classe", "Motif", "Justificatif"]],
    body: rows.map((row) => {
      const student = map.get(row.studentId);
      return [formatDate(row.date), row.heure || "—", fullName(student), student?.classe ?? "—", row.motif || "—", row.justificatif || "—"];
    }),
  });
  const end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(9);
  doc.text(`Total : ${formatNumber(rows.length)} retards`, 12, end + 8);
}

function permissionsTable(doc: jsPDF, options: ReportOptions, startY: number) {
  const map = studentMap(options.db.students);
  const rows = options.db.permissions.filter((row) => inRange(row.date, options)).sort((a, b) => b.date.localeCompare(a.date));
  autoTable(doc, {
    ...baseTable,
    startY,
    head: [["Date", "Élève", "Classe", "Sortie", "Retour", "Motif", "Autorisée par"]],
    body: rows.map((row) => {
      const student = map.get(row.studentId);
      return [formatDate(row.date), fullName(student), student?.classe ?? "—", row.heureSortie || "—", row.heureRetour || "—", row.motif || "—", row.autorisePar || "—"];
    }),
  });
  const end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(9);
  doc.text(`Total : ${formatNumber(rows.length)} permissions`, 12, end + 8);
}

function illnessTable(doc: jsPDF, options: ReportOptions, startY: number) {
  const map = studentMap(options.db.students);
  const rows = options.db.illness.filter((row) => inRange(row.date, options)).sort((a, b) => b.date.localeCompare(a.date));
  autoTable(doc, {
    ...baseTable,
    startY,
    head: [["Date", "Heure", "Élève", "Classe", "Motif général", "Prise en charge", "Parent contacté"]],
    body: rows.map((row) => {
      const student = map.get(row.studentId);
      return [formatDate(row.date), row.heure || "—", fullName(student), student?.classe ?? "—", row.motif || "—", row.priseEnCharge || "—", row.parentContacte ? "Oui" : "Non"];
    }),
  });
  const end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(9);
  doc.text(`Total : ${formatNumber(rows.length)} cas enregistrés`, 12, end + 8);
}

function disciplineTable(doc: jsPDF, options: ReportOptions, startY: number) {
  const map = studentMap(options.db.students);
  const rows = options.db.discipline.filter((row) => inRange(row.date, options)).sort((a, b) => b.date.localeCompare(a.date));
  autoTable(doc, {
    ...baseTable,
    startY,
    head: [["Date", "Élève", "Classe", "Type", "Gravité", "Mesure prise", "Sanction", "Responsable"]],
    body: rows.map((row) => {
      const student = map.get(row.studentId);
      return [
        formatDate(row.date),
        fullName(student),
        student?.classe ?? "—",
        row.type || "—",
        GRAVITY_LABELS[row.gravite],
        row.mesure || "—",
        row.sanction || "—",
        row.responsable || "—",
      ];
    }),
  });
  const end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(9);
  doc.text(`Total : ${formatNumber(rows.length)} faits — Sanctions : ${rows.filter((row) => row.gravite === "sanction").length}`, 12, end + 8);
}

function personnelTable(doc: jsPDF, options: ReportOptions, startY: number) {
  const rows = options.db.personnel.filter((row) => inRange(row.date, options)).sort((a, b) => b.date.localeCompare(a.date));
  autoTable(doc, {
    ...baseTable,
    startY,
    head: [["Date", "Jour", "Nom", "Fonction", "Arrivée", "Départ", "Signature"]],
    body: rows.map((row) => [formatDate(row.date), row.jour || "—", row.nom || "—", row.fonction || "—", row.heureArrivee || "—", row.heureDepart || "—", row.signature || "—"]),
  });
  const end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(9);
  doc.text(`Total : ${formatNumber(rows.length)} enregistrements du personnel`, 12, end + 8);
}

function monthlyReport(doc: jsPDF, options: ReportOptions, startY: number) {
  const stats = computeDashboard(options.db, new Date().toISOString().slice(0, 10));
  autoTable(doc, {
    ...baseTable,
    startY,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Élèves inscrits (actifs)", formatNumber(stats.total)],
      ["Garçons", formatNumber(stats.garcons)],
      ["Filles", formatNumber(stats.filles)],
      ["Taux de présence du jour", `${stats.tauxPresence} %`],
      ["Incidents disciplinaires", formatNumber(stats.incidents)],
      ["Sanctions", formatNumber(stats.sanctions)],
    ],
  });
  const end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(doc, {
    ...baseTable,
    startY: end + 6,
    head: [["Classe", "Absences", "Retards"]],
    body: uniqueClasses(options.db.students).map((classe) => {
      const ids = new Set(options.db.students.filter((student) => student.classe === classe).map((student) => student.id));
      const count = (rows: { studentId: string }[]) => rows.filter((row) => ids.has(row.studentId)).length;
      return [classe, String(count(options.db.attendance)), String(count(options.db.lateness))];
    }),
  });
}

function uniqueClasses(students: Student[]): string[] {
  return [...new Set(students.map((student) => student.classe).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** Fiche individuelle : identité, statistiques et historique complet. */
export function studentSheet(doc: jsPDF, options: ReportOptions, startY: number) {
  const student = options.db.students.find((item) => item.id === options.studentId);
  if (!student) return;

  const summary = studentSummary(options.db, student.id);
  const rows: [string, string][] = [
    ["Matricule", student.matricule],
    ["Nom", student.nom.toUpperCase()],
    ["Prénom", student.prenom],
    ["Sexe", student.sexe],
    ["Date de naissance", formatDate(student.dateNaissance)],
    ["Classe", student.classe],
    ["Niveau", student.niveau || "—"],
    ["Parent / tuteur", student.parentNom || "—"],
    ["Téléphone parent", student.parentTelephone || "—"],
    ["Adresse", student.adresse || "—"],
    ["Statut", student.statut],
    ["Inscrit le", formatDate(student.dateInscription)],
  ];

  autoTable(doc, { ...baseTable, startY, head: [["FICHE DE L'ÉLÈVE", "Informations"]], body: rows });

  let end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    ...baseTable,
    startY: end + 5,
    head: [["STATISTIQUES", "Nombre"]],
    body: [
      ["Absences", String(summary.absences)],
      ["Absences justifiées", String(summary.absencesJustifiees)],
      ["Retards", String(summary.retards)],
      ["Permissions", String(summary.permissions)],
      ["Cas de maladie", String(summary.maladies)],
      ["Incidents", String(summary.incidents)],
      ["Sanctions", String(summary.sanctions)],
    ],
  });

  end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const history = studentHistory(options.db, student.id);
  autoTable(doc, {
    ...baseTable,
    startY: end + 5,
    head: [["Date", "Type", "Motif", "Observation"]],
    body: history.map((row) => [formatDate(row.date), row.type, row.motif || "—", row.observation || "—"]),
  });
}

function generalReport(doc: jsPDF, options: ReportOptions, startY: number) {
  const today = new Date().toISOString().slice(0, 10);
  const stats = computeDashboard(options.db, today);
  const map = studentMap(options.db.students);

  autoTable(doc, {
    ...baseTable,
    startY,
    head: [["RAPPORT GÉNÉRAL", "Valeur"]],
    body: [
      ["Établissement", options.settings.schoolName || "—"],
      ["Année scolaire", options.settings.schoolYear || "—"],
      ["Surveillant", options.settings.surveillant || "—"],
      ["Élèves actifs", formatNumber(stats.total)],
      ["Garçons / Filles", `${stats.garcons} / ${stats.filles}`],
      ["Absents aujourd'hui", formatNumber(stats.absentsToday)],
      ["Retardataires aujourd'hui", formatNumber(stats.retardsToday)],
      ["Permissions aujourd'hui", formatNumber(stats.permissionsToday)],
      ["Cas de maladie aujourd'hui", formatNumber(stats.maladesToday)],
      ["Taux de présence", `${stats.tauxPresence} %`],
    ],
  });

  let end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const absents = options.db.attendance.filter((row) => row.date === today);
  if (absents.length) {
    autoTable(doc, {
      ...baseTable,
      startY: end + 5,
      head: [["Absents du jour", "Classe", "Motif"]],
      body: absents.map((row) => [fullName(map.get(row.studentId)), map.get(row.studentId)?.classe ?? "—", row.motif || "—"]),
    });
    end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  const late = options.db.lateness.filter((row) => row.date === today);
  if (late.length) {
    autoTable(doc, {
      ...baseTable,
      startY: end + 5,
      head: [["Retardataires du jour", "Classe", "Heure", "Motif"]],
      body: late.map((row) => [fullName(map.get(row.studentId)), map.get(row.studentId)?.classe ?? "—", row.heure || "—", row.motif || "—"]),
    });
  }
}

/** Export de la fiche d'un élève depuis la fiche à l'écran. */
export function exportStudentSheet(studentId: string, db: Database, settings: AppSettings): void {
  buildReport({ kind: "student", db, settings, periode: "Historique complet", studentId });
}
