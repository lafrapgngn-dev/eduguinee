/* =========================================================================
   nav.ts — LA LISTE DES ÉCRANS
   -------------------------------------------------------------------------
   Ajouter un nouvel écran = ajouter une ligne ici + un `case` dans App.tsx.
   `showInMenu: false` masque un écran du menu sans le supprimer.
   ========================================================================= */

import {
  BarChart3,
  CalendarCheck,
  Clock,
  FileDown,
  FileSearch,
  Home,
  DatabaseBackup,
  School,
  Settings,
  ShieldAlert,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";

export type PageId =
  | "dashboard"
  | "students"
  | "attendance"
  | "lateness"
  | "permissions"
  | "illness"
  | "discipline"
  | "personnel"
  | "search"
  | "statistics"
  | "reports"
  | "backup"
  | "settings";

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  emoji: string;
  showInMenu?: boolean;
  inBottomBar?: boolean;
}

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: Home, emoji: "🏠", inBottomBar: true },
  { id: "students", label: "Élèves", icon: Users, emoji: "👨‍🎓", inBottomBar: true },
  { id: "attendance", label: "Absences", icon: CalendarCheck, emoji: "📋", inBottomBar: true },
  { id: "lateness", label: "Retards", icon: Clock, emoji: "⏰" },
  { id: "permissions", label: "Permissions", icon: School, emoji: "📝" },
  { id: "illness", label: "Maladies", icon: Stethoscope, emoji: "🩺" },
  { id: "discipline", label: "Discipline", icon: ShieldAlert, emoji: "⚠️", inBottomBar: true },
  { id: "personnel", label: "Registre du personnel", icon: Users, emoji: "👥" },
  { id: "search", label: "Recherche avancée", icon: FileSearch, emoji: "🔍" },
  { id: "statistics", label: "Statistiques", icon: BarChart3, emoji: "📊" },
  { id: "reports", label: "Rapports PDF", icon: FileDown, emoji: "📄" },
  { id: "backup", label: "Sauvegarde", icon: DatabaseBackup, emoji: "💾" },
  { id: "settings", label: "Paramètres", icon: Settings, emoji: "⚙️" },
];

export const MENU_ITEMS = NAV.filter((item) => item.showInMenu !== false);
export const BOTTOM_ITEMS = NAV.filter((item) => item.inBottomBar);
