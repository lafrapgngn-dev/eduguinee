/* =========================================================================
   EventModule.tsx — MODULE GÉNÉRIQUE D'ÉVÉNEMENT
   -------------------------------------------------------------------------
   Les 5 modules (absences, retards, permissions, maladies, discipline)
   fonctionnent exactement pareil :
     - on choisit un élève,
     - une date,
     - quelques détails,
     - on enregistre, on modifie, on supprime.

   Au lieu de copier 5 fois le même code, on écrit UNE SEULE fois cette
   brique et chaque module lui donne simplement sa liste de champs
   (voir src/pages/*.tsx). C'est plus court, plus sûr et plus facile à corriger.
   ========================================================================= */

import { useMemo, useState } from "react";
import { Filter, Plus, Printer, Search, Trash2, Pencil } from "lucide-react";
import { useApp, type EventStore } from "../store/AppStore";
import { todayISO, uid, formatDate, normalizeText, fullName, isBetween, initials, formatNumber } from "../lib/format";
import { studentMap } from "../lib/stats";
import { clean, validateEvent, type Errors } from "../lib/validate";
import type { Student } from "../lib/types";
import { buildReport, type ReportKind } from "../lib/pdf";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Select,
  Table,
  Td,
  Tr,
  inputClass,
} from "./ui";

/* --------------------- Description d'un champ --------------------- */
export interface EventField {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "time" | "select" | "checkbox" | "number";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  wide?: boolean;
}

/* --------------------- Description d'une colonne ------------------ */
export interface EventColumn {
  label: string;
  field?: string;
  render?: (row: Record<string, unknown>, student?: Student) => React.ReactNode;
}

export type Row = Record<string, unknown>;

export function defaultValues(fields: EventField[]): Row {
  const row: Row = {};
  fields.forEach((field) => {
    if (field.type === "checkbox") row[field.name] = false;
    else if (field.type === "date") row[field.name] = todayISO();
    else if (field.type === "time") row[field.name] = "";
    else if (field.type === "select") row[field.name] = field.options?.[0]?.value ?? "";
    else row[field.name] = "";
  });
  return row;
}

/* ============================ SÉLECTEUR D'ÉLÈVE ============================ */
export function StudentSelect({ value, onChange, error }: { value: string; onChange: (id: string) => void; error?: string }) {
  const { db } = useApp();
  const [query, setQuery] = useState("");

  const students = useMemo(() => {
    const text = normalizeText(query);
    return [...db.students]
      .sort((a, b) => a.nom.localeCompare(b.nom))
      .filter((student) => !text || normalizeText(`${student.nom} ${student.prenom} ${student.matricule} ${student.classe}`).includes(text))
      .slice(0, 300);
  }, [db.students, query]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className={`${inputClass} pl-9`} placeholder="Rechercher un élève (nom, matricule, classe)" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">— Choisir un élève —</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {fullName(student)} — {student.classe} ({student.matricule})
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}

/* ============================== LE MODULE ============================== */
export function EventModule({
  store,
  title,
  emoji,
  subtitle,
  fields,
  columns,
  reportKind,
  idPrefix,
  searchPlaceholder = "Rechercher un élève…",
  stats,
}: {
  store: EventStore;
  title: string;
  emoji: string;
  subtitle?: string;
  fields: EventField[];
  columns: EventColumn[];
  reportKind: ReportKind;
  idPrefix: string;
  searchPlaceholder?: string;
  stats?: (rows: Row[]) => React.ReactNode;
}) {
  const { db, saveEvent, deleteEvent, settings, notify } = useApp();
  const rows = db[store] as unknown as Row[];

  /* --------- état local : filtres, formulaire, confirmations --------- */
  const [query, setQuery] = useState("");
  const [classe, setClasse] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [errors, setErrors] = useState<Errors>({});
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const students = studentMap(db.students);
  const classes = useMemo(() => [...new Set(db.students.map((student) => student.classe).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [db.students]);

  /* --------- filtrage --------- */
  const filtered = useMemo(() => {
    const text = normalizeText(query);
    return rows
      .filter((row) => {
        const student = students.get(String(row.studentId));
        const haystack = normalizeText(`${student ? fullName(student) : ""} ${student?.matricule ?? ""} ${student?.classe ?? ""} ${String(row.motif ?? "")} ${String(row.type ?? "")} ${String(row.description ?? "")}`);
        if (text && !haystack.includes(text)) return false;
        if (classe && student?.classe !== classe) return false;
        if (!isBetween(String(row.date ?? ""), dateDebut, dateFin)) return false;
        return true;
      })
      .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  }, [rows, query, classe, dateDebut, dateFin, students]);

  const openNew = () => {
    setForm({ id: uid(idPrefix), studentId: "", createdAt: new Date().toISOString(), ...defaultValues(fields) });
    setErrors({});
    setEditing({});
  };

  const openEdit = (row: Row) => {
    setForm({ ...row });
    setErrors({});
    setEditing(row);
  };

  const setValue = (name: string, value: string | boolean) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async () => {
    /* 1) Nettoyage des textes (sécurité + propreté). */
    const cleaned: Row = { ...form };
    fields.forEach((field) => {
      if (field.type === "checkbox") return;
      cleaned[field.name] = clean(String(form[field.name] ?? ""), 500);
    });

    /* 2) Validation. */
    const found = validateEvent({ studentId: String(cleaned.studentId ?? ""), date: String(cleaned.date ?? "") });
    if (Object.keys(found).length) {
      setErrors(found);
      notify("Veuillez corriger les champs en rouge.", "error");
      return;
    }

    await saveEvent(store, cleaned as unknown as { id: string });
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteEvent(store, String(toDelete.id));
    setToDelete(null);
  };

  const exportPdf = () => {
    if (!filtered.length) {
      notify("Aucune donnée à exporter sur cette période.", "error");
      return;
    }
    buildReport({
      kind: reportKind,
      db,
      settings,
      periode: dateDebut || dateFin ? `Période : ${formatDate(dateDebut)} au ${formatDate(dateFin)}` : "Période : toutes dates",
      dateDebut,
      dateFin,
      classe: classe || undefined,
    });
    notify("Rapport PDF généré.");
  };

  return (
    <div>
      <PageHeader
        title={`${emoji} ${title}`}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="secondary" icon={<Printer size={16} />} onClick={exportPdf}>
              PDF
            </Button>
            <Button icon={<Plus size={16} />} onClick={openNew}>
              Nouveau
            </Button>
          </>
        }
      />

      {/* --------- Barre de recherche + filtres --------- */}
      <div className="mb-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pl-9`} placeholder={searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Button variant={showFilters ? "primary" : "secondary"} icon={<Filter size={16} />} onClick={() => setShowFilters((value) => !value)}>
            Filtres
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label="Classe">
              <Select value={classe} onChange={setClasse} allLabel="Toutes les classes" options={classes.map((item) => ({ value: item, label: item }))} />
            </Field>
            <Field label="Date de début">
              <input type="date" className={inputClass} value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} />
            </Field>
            <Field label="Date de fin">
              <input type="date" className={inputClass} value={dateFin} onChange={(event) => setDateFin(event.target.value)} />
            </Field>
            <div className="sm:col-span-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setClasse("");
                  setDateDebut("");
                  setDateFin("");
                }}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        )}
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{formatNumber(filtered.length)} enregistrement(s) affiché(s)</p>
      </div>

      {stats && <div className="mb-3">{stats(filtered)}</div>}

      {/* --------- Tableau --------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<span className="text-3xl">{emoji}</span>}
            title="Aucun enregistrement"
            message="Modifiez les filtres ou appuyez sur « Nouveau » pour créer le premier enregistrement."
            action={
              <Button icon={<Plus size={16} />} onClick={openNew}>
                Nouveau
              </Button>
            }
          />
        ) : (
          <Table
            head={["Élève", ...columns.map((column) => column.label), "Actions"]}
          >
            {filtered.slice(0, 200).map((row) => {
              const student = students.get(String(row.studentId));
              return (
                <Tr key={String(row.id)}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Avatar photo={student?.photo} text={initials(student)} size={32} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold">{fullName(student)}</p>
                        <p className="text-[11px] text-slate-500">{student ? `${student.classe} · ${student.matricule}` : "Élève supprimé"}</p>
                      </div>
                    </div>
                  </Td>
                  {columns.map((column) => (
                    <Td key={column.label}>
                      {column.render ? column.render(row, student) : <span className="text-[13px]">{String(row[column.field ?? ""] ?? "—") || "—"}</span>}
                    </Td>
                  ))}
                  <Td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(row)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950" title="Modifier">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setToDelete(row)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title="Supprimer">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </div>

      {/* --------- Formulaire (modale) --------- */}
      <Modal
        open={editing !== null}
        title={form.createdAt && rows.some((row) => row.id === form.id) ? `Modifier — ${title}` : `Nouvel enregistrement — ${title}`}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button onClick={submit}>Enregistrer</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Élève concerné" error={errors.studentId} required className="sm:col-span-2">
            <StudentSelect value={String(form.studentId ?? "")} onChange={(id) => setValue("studentId", id)} error={errors.studentId} />
          </Field>

          {fields.map((field) => (
            <Field
              key={field.name}
              label={field.label}
              error={errors[field.name]}
              hint={field.hint}
              required={field.required}
              className={field.wide || field.type === "textarea" ? "sm:col-span-2" : undefined}
            >
              {field.type === "checkbox" ? (
                <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <input type="checkbox" className="h-5 w-5 accent-blue-700" checked={Boolean(form[field.name])} onChange={(event) => setValue(field.name, event.target.checked)} />
                  {field.placeholder || "Oui"}
                </label>
              ) : field.type === "textarea" ? (
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  placeholder={field.placeholder}
                  value={String(form[field.name] ?? "")}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              ) : field.type === "select" ? (
                <select className={inputClass} value={String(form[field.name] ?? "")} onChange={(event) => setValue(field.name, event.target.value)}>
                  <option value="">— Choisir —</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  className={inputClass}
                  placeholder={field.placeholder}
                  value={String(form[field.name] ?? "")}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              )}
            </Field>
          ))}
        </div>
      </Modal>

      {/* --------- Confirmation de suppression --------- */}
      <ConfirmDialog
        open={toDelete !== null}
        title="Confirmer la suppression"
        message={`Cette action est définitive. Voulez-vous vraiment supprimer cet enregistrement${toDelete ? ` du ${formatDate(String(toDelete.date))}` : ""} ?`}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

/** Petite carte de statistique réutilisée par les modules. */
export function MiniStat({ label, value, tone = "blue" }: { label: string; value: React.ReactNode; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-xl font-extrabold">{value}</p>
    </div>
  );
}

/** Badge "Oui / Non" pour les cases à cocher. */
export function YesNo({ value }: { value: unknown }) {
  return <Badge tone={value ? "green" : "slate"}>{value ? "Oui" : "Non"}</Badge>;
}
