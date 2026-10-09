/* =========================================================================
   seed.ts — DONNÉES DE DÉMONSTRATION
   -------------------------------------------------------------------------
   Sert UNIQUEMENT à tester l'application avec des données réalistes.
   Vous pourrez tout effacer depuis : Paramètres -> "Effacer les données".
   ========================================================================= */

import { STORES, clearStore, putMany } from "./db";
import { todayISO, uid } from "./format";
import type { Attendance, Database, Discipline, Gravity, Illness, Lateness, Permission, Sexe, Student } from "./types";

const NOMS = ["DIALLO", "TRAORE", "KONE", "COULIBALY", "SANGARE", "KEITA", "CAMARA", "TOURE", "SISSOKO", "FAYE", "NDIAYE", "BA", "SOW", "CISSE", "DOUMBIA"];
const PRENOMS_M = ["Amadou", "Ibrahim", "Moussa", "Souleymane", "Karim", "Youssef", "Adama", "Bakary", "Oumar", "Cheick"];
const PRENOMS_F = ["Aminata", "Fatoumata", "Mariam", "Awa", "Kadiatou", "Salimata", "Rokia", "Bintou", "Djeneba", "Oumou"];
const CLASSES = ["6ème A", "6ème B", "5ème A", "5ème B", "4ème A", "4ème B", "3ème A", "3ème B"];
const NIVEAUX: Record<string, string> = { "6": "Collège - 1er cycle", "5": "Collège - 1er cycle", "4": "Collège - 2nd cycle", "3": "Collège - 2nd cycle" };
const MOTIFS_ABSENCE = ["Maladie", "Raison familiale", "Non justifiée", "Retard de transport", "Travail des champs"];
const MOTIFS_RETARD = ["Transport", "Réveil tardif", "Travaux domestiques", "Non justifié"];
const TYPES_INCIDENT = ["Bavardage", "Bagarre", "Tricherie", "Manque de respect", "Téléphone en classe", "Sortie non autorisée"];
const MESURES = ["Rappel au règlement", "Travail d'intérêt scolaire", "Convocation des parents", "Exclusion temporaire"];

/** Date aléatoire dans les N derniers jours. */
function randomDate(days: number): string {
  const now = new Date();
  const offset = Math.floor(Math.random() * days);
  now.setDate(now.getDate() - offset);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function randomTime(): string {
  const hour = 7 + Math.floor(Math.random() * 3);
  const minute = Math.floor(Math.random() * 59);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Crée une base de démonstration complète. */
export function buildDemoDatabase(): Database {
  const students: Student[] = [];
  const attendance: Attendance[] = [];
  const lateness: Lateness[] = [];
  const permissions: Permission[] = [];
  const illness: Illness[] = [];
  const discipline: Discipline[] = [];

  const now = todayISO();
  const stamp = new Date().toISOString();

  for (let index = 0; index < 72; index++) {
    const sexe: Sexe = index % 2 === 0 ? "M" : "F";
    const classe = CLASSES[index % CLASSES.length];
    const nom = NOMS[index % NOMS.length];
    const prenom = sexe === "M" ? pick(PRENOMS_M) : pick(PRENOMS_F);
    const matricule = `MAT${String(2026 * 1000 + index + 1)}`;
    const birthYear = 2009 + (index % 4);

    students.push({
      id: uid("st_"),
      matricule,
      nom,
      prenom,
      sexe,
      dateNaissance: `${birthYear}-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 27) + 1).padStart(2, "0")}`,
      classe,
      niveau: NIVEAUX[classe[0]] || "Collège",
      parentNom: `${pick(NOMS)} ${pick([...PRENOMS_M, ...PRENOMS_F])}`,
      parentTelephone: `+223 7${Math.floor(10 + Math.random() * 89)} ${Math.floor(10 + Math.random() * 89)} ${Math.floor(10 + Math.random() * 89)} ${Math.floor(10 + Math.random() * 89)}`,
      adresse: pick(["Quartier Nord", "Quartier Sud", "Hamdallaye", "Faladié", "Lafiabougou", "Badalabougou"]),
      dateInscription: `${now.slice(0, 4)}-09-15`,
      statut: index % 23 === 0 ? "inactif" : "actif",
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  /* Événements répartis sur les 180 derniers jours. */
  students.forEach((student) => {
    const absences = Math.floor(Math.random() * 5);
    for (let index = 0; index < absences; index++) {
      attendance.push({
        id: uid("ab_"),
        studentId: student.id,
        date: randomDate(180),
        motif: pick(MOTIFS_ABSENCE),
        justifiee: Math.random() > 0.4,
        observation: "",
        createdAt: stamp,
      });
    }

    const retards = Math.floor(Math.random() * 4);
    for (let index = 0; index < retards; index++) {
      lateness.push({
        id: uid("rt_"),
        studentId: student.id,
        date: randomDate(180),
        heure: randomTime(),
        motif: pick(MOTIFS_RETARD),
        justificatif: Math.random() > 0.7 ? "Billet présenté" : "",
        observation: "",
        createdAt: stamp,
      });
    }

    if (Math.random() > 0.75) {
      permissions.push({
        id: uid("pm_"),
        studentId: student.id,
        date: randomDate(90),
        heureSortie: "10:00",
        heureRetour: "12:00",
        motif: pick(["Rendez-vous médical", "Course familiale", "Examens administratifs"]),
        autorisePar: "Le directeur",
        observation: "",
        createdAt: stamp,
      });
    }

    if (Math.random() > 0.85) {
      illness.push({
        id: uid("ml_"),
        studentId: student.id,
        date: randomDate(120),
        heure: randomTime(),
        motif: pick(["Céphalées", "Fatigue", "Douleurs abdominales", "Fièvre apparente"]),
        priseEnCharge: pick(["Infirmerie", "Repos à l'infirmerie", "Renvoyé chez les parents"]),
        parentContacte: Math.random() > 0.5,
        observation: "",
        createdAt: stamp,
      });
    }

    if (Math.random() > 0.7) {
      const gravite: Gravity = pick(["observation", "avertissement", "incident", "sanction"]);
      discipline.push({
        id: uid("dc_"),
        studentId: student.id,
        date: randomDate(180),
        type: pick(TYPES_INCIDENT),
        description: "Fait constaté par le surveillant pendant la récréation.",
        gravite,
        mesure: pick(MESURES),
        sanction: gravite === "sanction" ? pick(["2 jours d'exclusion", "Avertissement écrit", "Convoction des parents"]) : "",
        responsable: "Surveillant général",
        observation: "",
        createdAt: stamp,
      });
    }
  });

  /* Absences et retards du jour : pour que le tableau de bord soit parlant. */
  students.slice(0, 4).forEach((student) => {
    attendance.push({ id: uid("ab_"), studentId: student.id, date: now, motif: "Non justifiée", justifiee: false, observation: "", createdAt: stamp });
  });
  students.slice(5, 9).forEach((student) => {
    lateness.push({ id: uid("rt_"), studentId: student.id, date: now, heure: randomTime(), motif: "Transport", justificatif: "", observation: "", createdAt: stamp });
  });

  return { students, attendance, lateness, permissions, illness, discipline };
}

/** Écrit les données de démonstration dans IndexedDB. */
export async function installDemoData(): Promise<Database> {
  const demo = buildDemoDatabase();
  await Promise.all([
    clearStore(STORES.students).then(() => putMany(STORES.students, demo.students)),
    clearStore(STORES.attendance).then(() => putMany(STORES.attendance, demo.attendance)),
    clearStore(STORES.lateness).then(() => putMany(STORES.lateness, demo.lateness)),
    clearStore(STORES.permissions).then(() => putMany(STORES.permissions, demo.permissions)),
    clearStore(STORES.illness).then(() => putMany(STORES.illness, demo.illness)),
    clearStore(STORES.discipline).then(() => putMany(STORES.discipline, demo.discipline)),
  ]);
  return demo;
}
