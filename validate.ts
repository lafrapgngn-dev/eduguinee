/* =========================================================================
   validate.ts — CONTRÔLE DES SAISIES (SÉCURITÉ)
   -------------------------------------------------------------------------
   On ne fait JAMAIS confiance à ce que tape l'utilisateur. Chaque champ est
   vérifié ici, AVANT d'être enregistré. C'est une bonne pratique de
   sécurité : pas de donnée vide, pas de texte de 5000 caractères, pas de
   matricule en double.
   ========================================================================= */

import { normalizeText } from "./format";
import type { Student } from "./types";

export type Errors = Record<string, string>;

const MAX_TEXT = 200;

/** Supprime les espaces inutiles et limite la longueur (anti-abus). */
export function clean(value: string, max = MAX_TEXT): string {
  return (value ?? "").toString().trim().slice(0, max);
}

export function isPhone(value: string): boolean {
  return /^[+0-9 ()./-]{6,20}$/.test(value);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Validation du formulaire Élève. */
export function validateStudent(student: Omit<Student, "id" | "createdAt" | "updatedAt">, others: Student[]): Errors {
  const errors: Errors = {};

  if (!clean(student.matricule)) errors.matricule = "Le matricule est obligatoire.";
  if (!clean(student.nom)) errors.nom = "Le nom est obligatoire.";
  if (!clean(student.prenom)) errors.prenom = "Le prénom est obligatoire.";
  if (!student.sexe) errors.sexe = "Indiquez le sexe.";
  if (!student.dateNaissance) errors.dateNaissance = "La date de naissance est obligatoire.";
  if (!clean(student.classe)) errors.classe = "La classe est obligatoire.";
  if (student.parentTelephone && !isPhone(student.parentTelephone)) errors.parentTelephone = "Numéro de téléphone invalide.";

  if (student.dateNaissance && student.dateNaissance > new Date().toISOString().slice(0, 10)) {
    errors.dateNaissance = "La date de naissance ne peut pas être dans le futur.";
  }

  /* Matricule unique (on ignore l'élève en cours de modification). */
  const duplicate = others.some(
    (other) => normalizeText(other.matricule) === normalizeText(student.matricule) && other.id !== (student as Student).id
  );
  if (duplicate) errors.matricule = "Ce matricule existe déjà.";

  return errors;
}

/** Les événements (absence, retard...) : élève + date obligatoires. */
export function validateEvent(fields: { studentId: string; date: string }): Errors {
  const errors: Errors = {};
  if (!fields.studentId) errors.studentId = "Choisissez un élève.";
  if (!fields.date) errors.date = "La date est obligatoire.";
  if (fields.date && fields.date > new Date().toISOString().slice(0, 10)) errors.date = "La date ne peut pas être dans le futur.";
  return errors;
}

/** Compare deux objets simples (utile pour savoir si le formulaire a changé). */
export function isSameObject(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
