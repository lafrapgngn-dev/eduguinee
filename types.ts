/* =========================================================================
   types.ts — LA FORME DE NOS DONNÉES
   -------------------------------------------------------------------------
   Un "type" décrit à quoi ressemble un enregistrement. Ce fichier ne fait
   AUCUN calcul : c'est uniquement la référence (le dictionnaire) du projet.
   Les relations se font par identifiant (id) :

        student.id  ──┬──> attendance.studentId
                      ├──> lateness.studentId
                      ├──> permissions.studentId
                      ├──> illness.studentId
                      └──> discipline.studentId
   ========================================================================= */

export type Sexe = "M" | "F";
export type StudentStatus = "actif" | "inactif" | "transfere";

/* ------------------------------- ÉLÈVE ---------------------------------- */
export interface Student {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  dateNaissance: string; // "2010-05-14"
  classe: string; // "3ème A"
  niveau: string; // "Collège"
  parentNom: string;
  parentTelephone: string;
  adresse: string;
  photo?: string; // image encodée en "data:image/..." (facultative)
  dateInscription: string;
  statut: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ ABSENCE --------------------------------- */
export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  motif: string;
  justifiee: boolean;
  observation: string;
  createdAt: string;
}

/* ------------------------------- RETARD --------------------------------- */
export interface Lateness {
  id: string;
  studentId: string;
  date: string;
  heure: string; // "08:25"
  motif: string;
  justificatif: string;
  observation: string;
  createdAt: string;
}

/* ----------------------------- PERMISSION ------------------------------- */
export interface Permission {
  id: string;
  studentId: string;
  date: string;
  heureSortie: string;
  heureRetour: string;
  motif: string;
  autorisePar: string;
  observation: string;
  createdAt: string;
}

/* ------------------------------ MALADIE --------------------------------- */
export interface Illness {
  id: string;
  studentId: string;
  date: string;
  heure: string;
  motif: string;
  priseEnCharge: string;
  parentContacte: boolean;
  observation: string;
  createdAt: string;
}

/* ----------------------------- DISCIPLINE ------------------------------- */
export type Gravity = "observation" | "avertissement" | "incident" | "sanction";

export interface Discipline {
  id: string;
  studentId: string;
  date: string;
  type: string; // "Bavardage", "Bagarre", ...
  description: string;
  gravite: Gravity;
  mesure: string;
  sanction: string;
  responsable: string;
  observation: string;
  createdAt: string;
}

/* --------------------------- REGISTRE PERSONNEL ------------------------ */
export interface PersonnelRecord {
  id: string;
  nom: string;
  date: string;
  jour: string;
  fonction: string;
  heureArrivee: string;
  signature: string;
  heureDepart: string;
  createdAt: string;
}

/* ------------------------------ RÉGLAGES -------------------------------- */
export interface AppSettings {
  schoolName: string;
  schoolMotto: string;
  schoolYear: string;
  surveillant: string;
  logo?: string;
  pin?: string; // code PIN (jamais en clair : seulement une empreinte)
  darkMode: boolean;
}

/* --------------------------- SAUVEGARDE --------------------------------- */
export interface BackupEntry {
  id: string;
  label: string;
  date: string;
  size: number; // octets
  counts: Record<string, number>;
  data: string; // JSON texte de toutes les données
}

/* ----------------------- DONNÉES COMPLÈTES (contexte) ------------------- */
export interface Database {
  students: Student[];
  attendance: Attendance[];
  lateness: Lateness[];
  permissions: Permission[];
  illness: Illness[];
  discipline: Discipline[];
  personnel: PersonnelRecord[];
}

/* Libellés lisibles pour l'interface. */
export const GRAVITY_LABELS: Record<Gravity, string> = {
  observation: "Observation",
  avertissement: "Avertissement",
  incident: "Incident",
  sanction: "Sanction",
};

export const STATUS_LABELS: Record<StudentStatus, string> = {
  actif: "Actif",
  inactif: "Inactif",
  transfere: "Transféré",
};
