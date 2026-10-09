/* =========================================================================
   search.ts — MOTEUR DE RECHERCHE AVANCÉE
   -------------------------------------------------------------------------
   On reçoit des critères (nom, classe, sexe, situation, période) et on
   renvoie uniquement les élèves qui correspondent. La recherche est
   "insensible à la casse et aux accents" : "dupont" = "Dupont" = "DUPONT".
   ========================================================================= */

import { isBetween, normalizeText } from "./format";
import type { Attendance, Database, Discipline, Illness, Lateness, Permission, Sexe, Student, StudentStatus } from "./types";

export interface SearchCriteria {
  text: string; // nom, prénom ou matricule (recherche rapide)
  classe: string; // "" = toutes
  niveau: string; // "" = tous
  sexe: Sexe | ""; // "" = tous
  statut: StudentStatus | ""; // "" = tous
  absent: boolean;
  retard: boolean;
  permission: boolean;
  malade: boolean;
  sanction: boolean;
  dateDebut: string;
  dateFin: string;
}

export const EMPTY_CRITERIA: SearchCriteria = {
  text: "",
  classe: "",
  niveau: "",
  sexe: "",
  statut: "",
  absent: false,
  retard: false,
  permission: false,
  malade: false,
  sanction: false,
  dateDebut: "",
  dateFin: "",
};

/** Compte le nombre de critères réellement remplis (pour le bouton reset). */
export function countActiveCriteria(criteria: SearchCriteria): number {
  const keys: (keyof SearchCriteria)[] = [
    "text",
    "classe",
    "niveau",
    "sexe",
    "statut",
    "absent",
    "retard",
    "permission",
    "malade",
    "sanction",
    "dateDebut",
    "dateFin",
  ];
  return keys.filter((key) => {
    const value = criteria[key];
    return typeof value === "boolean" ? value : Boolean(value);
  }).length;
}

/** Un élève a-t-il eu un événement dans la période choisie ? */
function hasEvent<T extends { studentId: string; date: string }>(rows: T[], studentId: string, from: string, to: string): boolean {
  return rows.some((row) => row.studentId === studentId && isBetween(row.date, from, to));
}

export interface SearchResult {
  student: Student;
  absences: number;
  retards: number;
  permissions: number;
  maladies: number;
  sanctions: number;
}

/** Lance la recherche et renvoie les résultats enrichis (compteurs). */
export function runSearch(db: Database, criteria: SearchCriteria): SearchResult[] {
  const query = normalizeText(criteria.text);
  const from = criteria.dateDebut;
  const to = criteria.dateFin;

  /* Les situations cochées : l'élève doit avoir AU MOINS UN de ces events. */
  const situations = [
    { active: criteria.absent, rows: db.attendance as { studentId: string; date: string }[] },
    { active: criteria.retard, rows: db.lateness as { studentId: string; date: string }[] },
    { active: criteria.permission, rows: db.permissions as { studentId: string; date: string }[] },
    { active: criteria.malade, rows: db.illness as { studentId: string; date: string }[] },
    {
      active: criteria.sanction,
      rows: db.discipline.filter((row) => row.gravite === "sanction") as unknown as { studentId: string; date: string }[],
    },
  ];
  const activeSituations = situations.filter((situation) => situation.active);

  const results: SearchResult[] = [];

  db.students.forEach((student) => {
    /* 1) Recherche texte : nom, prénom, matricule, téléphone, classe. */
    if (query) {
      const haystack = normalizeText(
        `${student.nom} ${student.prenom} ${student.matricule} ${student.classe} ${student.parentNom} ${student.parentTelephone}`
      );
      if (!haystack.includes(query)) return;
    }

    /* 2) Filtres par liste déroulante. */
    if (criteria.classe && student.classe !== criteria.classe) return;
    if (criteria.niveau && student.niveau !== criteria.niveau) return;
    if (criteria.sexe && student.sexe !== criteria.sexe) return;
    if (criteria.statut && student.statut !== criteria.statut) return;

    /* 3) Situations cochées sur la période. */
    if (activeSituations.length) {
      const matches = activeSituations.some((situation) => hasEvent(situation.rows, student.id, from, to));
      if (!matches) return;
    }

    /* 4) On prépare les compteurs pour l'affichage du tableau. */
    results.push({
      student,
      absences: db.attendance.filter((row: Attendance) => row.studentId === student.id).length,
      retards: db.lateness.filter((row: Lateness) => row.studentId === student.id).length,
      permissions: db.permissions.filter((row: Permission) => row.studentId === student.id).length,
      maladies: db.illness.filter((row: Illness) => row.studentId === student.id).length,
      sanctions: db.discipline.filter((row: Discipline) => row.studentId === student.id && row.gravite === "sanction").length,
    });
  });

  return results.sort((a, b) => a.student.nom.localeCompare(b.student.nom));
}

/** Recherche instantanée (barre du module Élèves). */
export function quickSearch(students: Student[], text: string, classe = ""): Student[] {
  const query = normalizeText(text);
  return students.filter((student) => {
    if (classe && student.classe !== classe) return false;
    if (!query) return true;
    return normalizeText(`${student.nom} ${student.prenom} ${student.matricule} ${student.classe} ${student.parentNom}`).includes(query);
  });
}
