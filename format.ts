/* =========================================================================
   format.ts — PETITS OUTILS RÉUTILISABLES
   -------------------------------------------------------------------------
   Des fonctions toutes simples, utilisées dans toute l'application pour
   éviter de répéter le même code (principe DRY : Don't Repeat Yourself).
   ========================================================================= */

/** Identifiant unique : horodatage + partie aléatoire. */
export function uid(prefix = ""): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${random}`;
}

/** Date du jour au format "2026-01-31" (format des champs <input type=date>). */
export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Heure actuelle au format "08:25". */
export function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** "2026-01-31" -> "31/01/2026" (et reste lisible si la date est vide). */
export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** "31/01/2026 à 08:25" avec l'heure éventuelle. */
export function formatDateHeure(iso?: string, heure?: string): string {
  const base = formatDate(iso);
  return heure ? `${base} · ${heure}` : base;
}

/** Premier jour du mois courant (pour les filtres de période). */
export function firstDayOfMonth(): string {
  return `${todayISO().slice(0, 7)}-01`;
}

/** Dernier jour du mois courant. */
export function lastDayOfMonth(): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const offset = last.getTimezoneOffset() * 60000;
  return new Date(last.getTime() - offset).toISOString().slice(0, 10);
}

/** "2026-01-31" -> "janv. 2026" */
export function monthLabel(iso: string): string {
  const date = new Date(`${iso.slice(0, 7)}-01T12:00:00`);
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

/** Liste les N derniers mois (la plus ancienne en premier). */
export function lastMonths(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    out.push(iso);
  }
  return out;
}

/** "dupont" et "Dupont" et "DUPONT" deviennent identiques (sans accents). */
export function normalizeText(value: string): string {
  return (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Nom complet d'un élève : "DUPONT Jean". */
export function fullName(student?: { nom: string; prenom: string }): string {
  if (!student) return "Élève supprimé";
  return `${student.nom.toUpperCase()} ${student.prenom}`;
}

/** Initiales pour l'avatar quand il n'y a pas de photo. */
export function initials(student?: { nom: string; prenom: string }): string {
  if (!student) return "?";
  return `${(student.prenom || " ")[0] ?? ""}${(student.nom || " ")[0] ?? ""}`.toUpperCase();
}

/** Numéro formaté : 1234 -> "1 234". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value || 0);
}

/** 15 -> "15 janv." (pour les axes des graphiques). */
export function shortMonthLabel(monthISO: string): string {
  return monthLabel(monthISO).replace(" 20", " ");
}

/** Calcule l'âge à partir de la date de naissance. */
export function age(dateNaissance?: string): string {
  if (!dateNaissance) return "—";
  const birth = new Date(dateNaissance);
  if (Number.isNaN(birth.getTime())) return "—";
  const diff = Date.now() - birth.getTime();
  return `${Math.floor(diff / (365.25 * 24 * 3600 * 1000))} ans`;
}

/** Compare deux dates ISO (utile pour trier les tableaux). */
export function compareISO(a: string, b: string): number {
  return (a || "").localeCompare(b || "");
}

/** Vérifie qu'une date est comprise entre deux bornes (bornes facultatives). */
export function isBetween(dateISO: string, start?: string, end?: string): boolean {
  if (start && dateISO < start) return false;
  if (end && dateISO > end) return false;
  return true;
}
