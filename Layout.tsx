/* =========================================================================
   Layout.tsx — LA STRUCTURE VISUELLE
   -------------------------------------------------------------------------
   Trois zones :
     1. Barre supérieure  : titre, badge de connexion, bouton menu.
     2. Menu latéral      : visible sur grand écran, tiroir sur mobile.
     3. Barre inférieure  : accès rapide au doigt sur Android.
   Le contenu de l'écran courant est affiché au centre ({children}).
   ========================================================================= */

import { useState, type ReactNode } from "react";
import { Cloud, CloudOff, Menu, X } from "lucide-react";
import { BOTTOM_ITEMS, MENU_ITEMS, type PageId } from "./nav";
import { cn } from "../utils/cn";
import { useApp } from "../store/AppStore";
import { Avatar, Button } from "./ui";

export function Layout({ page, onNavigate, children }: { page: PageId; onNavigate: (page: PageId) => void; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { online, settings, db } = useApp();

  const go = (id: PageId) => {
    onNavigate(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const current = MENU_ITEMS.find((item) => item.id === page);

  return (
    <div className="premium-shell min-h-screen text-slate-900 dark:text-slate-50">
      {/* ---------------- BARRE SUPÉRIEURE ---------------- */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-950/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-4">
          <button onClick={() => setMenuOpen(true)} className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Ouvrir le menu">
            <Menu size={20} />
          </button>

          <div className="flex min-w-0 items-center gap-3">
            <span className="logo-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white">SM</span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Business suite</p>
              <p className="truncate text-sm font-black text-slate-900 dark:text-white">Surveillant Manager</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold shadow-sm sm:flex",
                online ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/70 dark:text-blue-300" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300"
              )}
            >
              {online ? <Cloud size={13} /> : <CloudOff size={13} />}
              {online ? "En ligne" : "Hors ligne"}
            </span>
            <Button variant="secondary" className="!min-h-[38px] !px-3 !rounded-xl shadow-sm" onClick={() => go("students")}>
              {db.students.length} élèves
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-5 px-3 py-4 sm:px-4">
        {/* ---------------- MENU LATÉRAL (grand écran) ---------------- */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <nav className="premium-panel sticky top-[82px] space-y-1 rounded-[24px] p-2.5">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200",
                    page === item.id ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.35)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  )}
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", page === item.id ? "bg-white/15" : "bg-slate-100 dark:bg-slate-800")}>
                    <Icon size={16} />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ---------------- CONTENU ---------------- */}
        <main className="min-w-0 flex-1 pb-20 lg:pb-5">
          {current && (
            <p className="mb-2 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 lg:hidden">
              <current.icon size={13} /> {current.label}
            </p>
          )}
          <div className="animate-page">{children}</div>
        </main>
      </div>

      {/* ---------------- TIROIR DE MENU (mobile) ---------------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMenuOpen(false)} />
          <aside className="animate-pop absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <Avatar text="SM" size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{settings.surveillant}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{settings.schoolYear}</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer le menu">
                <X size={18} />
              </button>
            </div>
            <nav className="nice-scroll flex-1 overflow-y-auto p-2">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold",
                      page === item.id ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="text-base">{item.emoji}</span>
                    <Icon size={16} className="opacity-60" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <p className="flex items-center gap-2 text-[11px] font-bold">
                {online ? <Cloud size={13} className="text-blue-600" /> : <CloudOff size={13} className="text-emerald-600" />}
                <span className={online ? "text-blue-700 dark:text-blue-300" : "text-emerald-700 dark:text-emerald-300"}>
                  {online ? "Connexion disponible — données locales actives" : "Application hors ligne prête"}
                </span>
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* ---------------- BARRE INFÉRIEURE (Android) ---------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-md">
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold", page === item.id ? "text-blue-700 dark:text-blue-400" : "text-slate-400")}
              >
                <Icon size={20} />
                {item.label.split(" ")[0]}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
