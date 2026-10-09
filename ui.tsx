/* =========================================================================
   ui.tsx — LES BRIQUES DE L'INTERFACE
   -------------------------------------------------------------------------
   Une seule fois écrites, ces briques servent partout : bouton, carte,
   champ de formulaire, modale, tableau, état vide, bandeau statistique,
   boîte de confirmation et notifications.
   Avantage : le style reste identique dans toute l'application.
   ========================================================================= */

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "../utils/cn";

/* ------------------------------- BOUTON -------------------------------- */
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success";

export function Button({
  children,
  onClick,
  variant = "primary",
  icon,
  className,
  type = "button",
  disabled,
  full,
  title,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
  title?: string;
}) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 shadow-[0_10px_24px_rgba(79,70,229,0.28)]",
    secondary: "border border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800",
    danger: "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-[0_10px_24px_rgba(239,68,68,0.28)] hover:from-red-400 hover:to-rose-500",
    success: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_10px_24px_rgba(16,185,129,0.28)] hover:from-emerald-400 hover:to-teal-500",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  };

  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        full && "w-full",
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* -------------------------------- CARTE -------------------------------- */
export function Card({ children, className, title, subtitle, actions }: { children?: ReactNode; className?: string; title?: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <section className={cn("premium-panel rounded-[24px] p-4", className)}>
      {(title || actions) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/* ------------------------- CARTE STATISTIQUE --------------------------- */
export function StatCard({ label, value, icon, tone = "blue", hint }: { label: string; value: ReactNode; icon?: ReactNode; tone?: "blue" | "green" | "amber" | "red" | "violet" | "slate"; hint?: string }) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        {icon && <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tones[tone])}>{icon}</span>}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold leading-none text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

/* ------------------------------- CHAMP --------------------------------- */
export function Field({ label, children, error, hint, className, required }: { label: string; children: ReactNode; error?: string; hint?: string; className?: string; required?: boolean }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] font-semibold text-red-600">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:ring-blue-950";

/* ------------------------------- MODALE -------------------------------- */
export function Modal({ open, title, children, onClose, footer, wide }: { open: boolean; title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          "animate-pop relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900",
          wide ? "sm:max-w-4xl" : "sm:max-w-lg"
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
            <X size={18} />
          </button>
        </header>
        <div className="nice-scroll flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">{footer}</footer>}
      </div>
    </div>
  );
}

/* ---------------------- CONFIRMATION DE SUPPRESSION -------------------- */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Supprimer",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="animate-pop w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950">
            <AlertTriangle size={20} />
          </span>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" full onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="danger" full onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ ÉTAT VIDE ------------------------------ */
export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
      {icon && <div className="text-slate-300 dark:text-slate-600">{icon}</div>}
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</p>
      {message && <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ------------------------------- BADGE --------------------------------- */
export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "red" | "amber" | "blue" | "violet" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  };
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-bold", tones[tone])}>{children}</span>;
}

/* --------------------------- TABLEAU RESPONSIVE ----------------------- */
export type HeadCell = string | { label: string; onClick?: () => void; active?: boolean; direction?: "asc" | "desc" };

export function Table({ head, children }: { head: HeadCell[]; children: ReactNode }) {
  return (
    <div className="nice-scroll -mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {head.map((cell, index) => {
              const label = typeof cell === "string" ? cell : cell.label;
              const clickable = typeof cell !== "string" && Boolean(cell.onClick);
              return (
                <th key={`${label}-${index}`} className="whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {clickable ? (
                    <button onClick={(cell as { onClick: () => void }).onClick} className="flex items-center gap-1 hover:text-blue-600">
                      {label}
                      <span className="text-[9px]">{(cell as { direction?: "asc" | "desc" }).direction === "desc" ? "▼" : "▲"}</span>
                    </button>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className={cn("border-b border-slate-100 last:border-0 dark:border-slate-800", onClick && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60")}>
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-2 py-2.5 align-middle text-slate-700 dark:text-slate-200", className)}>{children}</td>;
}

/* ---------------------------- AVATAR ÉLÈVE ---------------------------- */
export function Avatar({ photo, text, size = 40 }: { photo?: string; text: string; size?: number }) {
  if (photo) {
    return <img src={photo} alt={text} style={{ width: size, height: size }} className="rounded-full object-cover" />;
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size / 2.6 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    >
      {text}
    </span>
  );
}

/* ---------------------------- PAGINATION ------------------------------ */
export function Pagination({ page, pages, onChange, total }: { page: number; pages: number; onChange: (page: number) => void; total: number }) {
  if (pages <= 1) return <p className="mt-3 text-center text-xs text-slate-500">{total} résultat(s)</p>;

  const visiblePages: Array<number | "ellipsis"> = [];
  const maxButtons = 5;
  let start = Math.max(1, page - Math.floor(maxButtons / 2));
  let end = Math.min(pages, start + maxButtons - 1);

  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  if (start > 1) {
    visiblePages.push(1);
    if (start > 2) visiblePages.push("ellipsis");
  }

  for (let index = start; index <= end; index += 1) {
    visiblePages.push(index);
  }

  if (end < pages) {
    if (end < pages - 1) visiblePages.push("ellipsis");
    visiblePages.push(pages);
  }

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        Page {page} / {pages} · {total} élém.
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" className="min-h-[36px] px-3 text-xs" onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}>
          Précédent
        </Button>

        {visiblePages.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-400">
                …
              </span>
            );
          }

          const isCurrent = item === page;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(Number(item))}
              className={cn(
                "min-h-[36px] min-w-[36px] rounded-lg border px-2 text-xs font-bold transition-all",
                isCurrent
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:text-blue-300"
              )}
            >
              {item}
            </button>
          );
        })}

        <Button variant="secondary" className="min-h-[36px] px-3 text-xs" onClick={() => onChange(Math.min(pages, page + 1))} disabled={page >= pages}>
          Suivant
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------- NOTIFICATIONS --------------------------- */
export function ToastStack({ toasts, onDismiss }: { toasts: { id: string; message: string; type: "success" | "error" | "info" }[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[70] flex flex-col items-center gap-2 px-3">
      {toasts.map((toast) => {
        const tones = {
          success: { style: "bg-emerald-600", Icon: CheckCircle2 },
          error: { style: "bg-red-600", Icon: XCircle },
          info: { style: "bg-slate-800", Icon: Info },
        }[toast.type];

        return (
          <button
            key={toast.id}
            onClick={() => onDismiss(toast.id)}
            className={cn("animate-pop pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white shadow-lg", tones.style)}
          >
            <tones.Icon size={18} />
            <span className="flex-1">{toast.message}</span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------- LOADER / SPINNER -------------------------- */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      {label && <p className="text-sm font-semibold">{label}</p>}
    </div>
  );
}

/* ---------------------- PETIT COMMUTATEUR (switch) -------------------- */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
    >
      <span>{label}</span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

/* ------------------- TÊTE DE SECTION + RETOUR ------------------------- */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/* --------------------- LISTE DÉROULANTE (select) ---------------------- */
export function Select({ value, onChange, options, allLabel }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; allLabel?: string }) {
  return (
    <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
      {allLabel && <option value="">{allLabel}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Petit accroche réutilisable pour les messages d'aide. */
export function Callout({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "amber" | "green" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200",
    amber: "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    green: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  };
  return <div className={cn("rounded-xl p-3 text-xs leading-relaxed", tones[tone])}>{children}</div>;
}

/** Crochet simple pour fermer un menu au clic extérieur. */
export function useOutsideClick(onOutside: () => void) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!ref) return;
    const handler = (event: MouseEvent) => {
      if (!ref.contains(event.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
  return setRef;
}
