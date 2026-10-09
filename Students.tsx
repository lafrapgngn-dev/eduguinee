/* =========================================================================
   Students.tsx — MODULE ÉLÈVES
   -------------------------------------------------------------------------
   Fonctions : ajouter, modifier, supprimer (avec confirmation), consulter
   la fiche, rechercher instantanément, filtrer par classe/sexe/statut,
   trier, paginer, exporter (PDF et CSV).
   ========================================================================= */

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, FileDown, FileSpreadsheet, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import { useApp } from "../store/AppStore";
import { exportCsvFile } from "../lib/backup";
import { buildReport } from "../lib/pdf";
import { age, formatDate, fullName, formatNumber, initials, normalizeText, todayISO, uid } from "../lib/format";
import { clean, validateStudent, type Errors } from "../lib/validate";
import { classList } from "../lib/stats";
import { StudentSheet } from "../components/StudentSheet";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Table,
  Td,
  Tr,
  inputClass,
} from "../components/ui";
import { STATUS_LABELS, type Student, type StudentStatus, type Sexe } from "../lib/types";

const PAGE_SIZE = 20;

/* Formulaire vide : valeurs par défaut. */
function emptyStudent(): Student {
  const now = new Date().toISOString();
  return {
    id: uid("st_"),
    matricule: "",
    nom: "",
    prenom: "",
    sexe: "M",
    dateNaissance: "",
    classe: "",
    niveau: "Collège",
    parentNom: "",
    parentTelephone: "",
    adresse: "",
    photo: undefined,
    dateInscription: todayISO(),
    statut: "actif",
    createdAt: now,
    updatedAt: now,
  };
}

export default function Students() {
  const { db, settings, saveStudent, deleteStudent, notify } = useApp();

  /* ---------------- états de l'écran ---------------- */
  const [query, setQuery] = useState("");
  const [classe, setClasse] = useState("");
  const [sexe, setSexe] = useState<Sexe | "">("");
  const [statut, setStatut] = useState<StudentStatus | "">("");
  const [sortKey, setSortKey] = useState<"nom" | "classe" | "matricule">("nom");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Student>(emptyStudent());
  const [errors, setErrors] = useState<Errors>({});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Student | null>(null);

  const classes = classList(db.students);

  /* ---------------- filtrage + tri + pagination ---------------- */
  const filtered = useMemo(() => {
    const text = normalizeText(query);
    const rows = db.students.filter((student) => {
      if (classe && student.classe !== classe) return false;
      if (sexe && student.sexe !== sexe) return false;
      if (statut && student.statut !== statut) return false;
      if (!text) return true;
      return normalizeText(`${student.nom} ${student.prenom} ${student.matricule} ${student.classe} ${student.parentNom} ${student.parentTelephone}`).includes(text);
    });

    rows.sort((a, b) => {
      const left = String(a[sortKey] ?? "");
      const right = String(b[sortKey] ?? "");
      return sortAsc ? left.localeCompare(right) : right.localeCompare(left);
    });

    return rows;
  }, [db.students, query, classe, sexe, statut, sortKey, sortAsc]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    setPage((current) => Math.min(current, pages));
  }, [pages]);

  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /* ---------------- formulaire ---------------- */
  const openNew = () => {
    setForm(emptyStudent());
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (student: Student) => {
    setForm({ ...student });
    setErrors({});
    setFormOpen(true);
  };

  const set = (patch: Partial<Student>) => setForm((current) => ({ ...current, ...patch }));

  /* Photo : on lit le fichier et on le transforme en texte "data:image/..." */
  const pickPhoto = (file?: File) => {
    if (!file) return;
    if (file.size > 800 * 1024) {
      notify("Photo trop lourde (max 800 Ko).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set({ photo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const cleaned: Student = {
      ...form,
      matricule: clean(form.matricule, 30),
      nom: clean(form.nom, 60).toUpperCase(),
      prenom: clean(form.prenom, 60),
      classe: clean(form.classe, 30),
      niveau: clean(form.niveau, 40),
      parentNom: clean(form.parentNom, 80),
      parentTelephone: clean(form.parentTelephone, 25),
      adresse: clean(form.adresse, 150),
    };

    const found = validateStudent(cleaned, db.students);
    if (Object.keys(found).length) {
      setErrors(found);
      notify("Veuillez corriger les champs en rouge.", "error");
      return;
    }

    await saveStudent(cleaned);
    setFormOpen(false);
  };

  /* ---------------- exports ---------------- */
  const exportPdf = () => {
    if (!filtered.length) return notify("Aucun élève à exporter.", "error");
    buildReport({ kind: "students", db, settings, periode: classe ? `Classe : ${classe}` : "Toutes les classes", classe: classe || undefined });
    notify("Liste PDF générée.");
  };

  const exportCsv = () => {
    if (!filtered.length) return notify("Aucun élève à exporter.", "error");
    exportCsvFile(
      `eleves-${todayISO()}.csv`,
      ["Matricule", "Nom", "Prénom", "Sexe", "Naissance", "Classe", "Niveau", "Parent", "Téléphone", "Adresse", "Statut"],
      filtered.map((student) => [student.matricule, student.nom, student.prenom, student.sexe, student.dateNaissance, student.classe, student.niveau, student.parentNom, student.parentTelephone, student.adresse, STATUS_LABELS[student.statut]])
    );
    notify("Fichier CSV exporté.");
  };

  const toggleSort = (key: "nom" | "classe" | "matricule") => {
    if (sortKey === key) setSortAsc((value) => !value);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div>
      <PageHeader
        title="👨‍🎓 Élèves"
        subtitle={`${formatNumber(db.students.length)} élèves enregistrés · ${formatNumber(filtered.length)} affiché(s)`}
        actions={
          <>
            <Button variant="secondary" icon={<FileSpreadsheet size={16} />} onClick={exportCsv}>
              CSV
            </Button>
            <Button variant="secondary" icon={<FileDown size={16} />} onClick={exportPdf}>
              PDF
            </Button>
            <Button icon={<Plus size={16} />} onClick={openNew}>
              Nouvel élève
            </Button>
          </>
        }
      />

      {/* ---------------- RECHERCHE + FILTRES ---------------- */}
      <div className="mb-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Rechercher : nom, prénom, matricule, classe, parent…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label="Classe">
            <Select
              value={classe}
              onChange={(value) => {
                setClasse(value);
                setPage(1);
              }}
              allLabel="Toutes les classes"
              options={classes.map((item) => ({ value: item, label: item }))}
            />
          </Field>
          <Field label="Sexe">
            <Select
              value={sexe}
              onChange={(value) => {
                setSexe(value as Sexe | "");
                setPage(1);
              }}
              allLabel="Tous"
              options={[
                { value: "M", label: "Garçons" },
                { value: "F", label: "Filles" },
              ]}
            />
          </Field>
          <Field label="Statut">
            <Select
              value={statut}
              onChange={(value) => {
                setStatut(value as StudentStatus | "");
                setPage(1);
              }}
              allLabel="Tous"
              options={(Object.keys(STATUS_LABELS) as StudentStatus[]).map((key) => ({ value: key, label: STATUS_LABELS[key] }))}
            />
          </Field>
        </div>
      </div>

      {/* ---------------- TABLEAU ---------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {visible.length === 0 ? (
          <EmptyState
            icon={<UserRound size={40} />}
            title="Aucun élève trouvé"
            message="Modifiez la recherche ou ajoutez un nouvel élève."
            action={
              <Button icon={<Plus size={16} />} onClick={openNew}>
                Nouvel élève
              </Button>
            }
          />
        ) : (
          <>
            <Table
              head={[
                { label: "Élève", onClick: () => toggleSort("nom"), active: sortKey === "nom", direction: sortAsc ? "asc" : "desc" },
                { label: "Matricule", onClick: () => toggleSort("matricule"), active: sortKey === "matricule", direction: sortAsc ? "asc" : "desc" },
                { label: "Classe", onClick: () => toggleSort("classe"), active: sortKey === "classe", direction: sortAsc ? "asc" : "desc" },
                "Sexe",
                "Âge",
                "Parent",
                "Statut",
                "Actions",
              ]}
            >
              {visible.map((student) => (
                <Tr key={student.id} onClick={() => setDetailId(student.id)}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Avatar photo={student.photo} text={initials(student)} size={34} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold">{fullName(student)}</p>
                        <p className="text-[11px] text-slate-500">Né(e) le {formatDate(student.dateNaissance)}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[12px] font-semibold">{student.matricule}</Td>
                  <Td className="text-[12px]">{student.classe}</Td>
                  <Td>
                    <Badge tone={student.sexe === "M" ? "blue" : "violet"}>{student.sexe}</Badge>
                  </Td>
                  <Td className="text-[12px]">{age(student.dateNaissance)}</Td>
                  <Td className="text-[12px]">
                    {student.parentNom || "—"}
                    <span className="block text-[11px] text-slate-500">{student.parentTelephone}</span>
                  </Td>
                  <Td>
                    <Badge tone={student.statut === "actif" ? "green" : student.statut === "transfere" ? "amber" : "slate"}>{STATUS_LABELS[student.statut]}</Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
                      <button onClick={() => openEdit(student)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950" title="Modifier">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setToDelete(student)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title="Supprimer">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Table>
            <Pagination page={currentPage} pages={pages} total={filtered.length} onChange={setPage} />
          </>
        )}
      </div>

      {/* ---------------- FORMULAIRE ---------------- */}
      <Modal
        open={formOpen}
        wide
        title={db.students.some((student) => student.id === form.id) ? "Modifier l'élève" : "Nouvel élève"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submit}>Enregistrer</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Matricule" error={errors.matricule} required>
            <input className={inputClass} value={form.matricule} onChange={(event) => set({ matricule: event.target.value })} placeholder="Ex : MAT2026001" />
          </Field>
          <Field label="Classe" error={errors.classe} required>
            <input className={inputClass} value={form.classe} onChange={(event) => set({ classe: event.target.value })} placeholder="Ex : 3ème A" list="classes-list" />
          </Field>
          <Field label="Nom" error={errors.nom} required>
            <input className={inputClass} value={form.nom} onChange={(event) => set({ nom: event.target.value })} placeholder="DUPONT" />
          </Field>
          <Field label="Prénom" error={errors.prenom} required>
            <input className={inputClass} value={form.prenom} onChange={(event) => set({ prenom: event.target.value })} placeholder="Jean" />
          </Field>
          <Field label="Sexe" error={errors.sexe} required>
            <Select
              value={form.sexe}
              onChange={(value) => set({ sexe: value as Sexe })}
              options={[
                { value: "M", label: "Masculin" },
                { value: "F", label: "Féminin" },
              ]}
            />
          </Field>
          <Field label="Date de naissance" error={errors.dateNaissance} required>
            <input type="date" className={inputClass} value={form.dateNaissance} onChange={(event) => set({ dateNaissance: event.target.value })} />
          </Field>
          <Field label="Niveau">
            <input className={inputClass} value={form.niveau} onChange={(event) => set({ niveau: event.target.value })} placeholder="Ex : Collège - 2nd cycle" />
          </Field>
          <Field label="Statut">
            <Select value={form.statut} onChange={(value) => set({ statut: value as StudentStatus })} options={(Object.keys(STATUS_LABELS) as StudentStatus[]).map((key) => ({ value: key, label: STATUS_LABELS[key] }))} />
          </Field>
          <Field label="Nom du parent / tuteur">
            <input className={inputClass} value={form.parentNom} onChange={(event) => set({ parentNom: event.target.value })} />
          </Field>
          <Field label="Téléphone du parent" error={errors.parentTelephone}>
            <input type="tel" className={inputClass} value={form.parentTelephone} onChange={(event) => set({ parentTelephone: event.target.value })} placeholder="+223 00 00 00 00" />
          </Field>
          <Field label="Adresse" className="sm:col-span-2">
            <input className={inputClass} value={form.adresse} onChange={(event) => set({ adresse: event.target.value })} />
          </Field>
          <Field label="Date d'inscription">
            <input type="date" className={inputClass} value={form.dateInscription} onChange={(event) => set({ dateInscription: event.target.value })} />
          </Field>
          <Field label="Photo (facultative)" hint="PNG ou JPG — 800 Ko maximum">
            <div className="flex items-center gap-2">
              <Avatar photo={form.photo} text={initials(form)} size={44} />
              <input type="file" accept="image/*" className="text-xs" onChange={(event) => pickPhoto(event.target.files?.[0])} />
              {form.photo && (
                <Button variant="ghost" onClick={() => set({ photo: undefined })}>
                  Retirer
                </Button>
              )}
            </div>
          </Field>
        </div>
        <datalist id="classes-list">
          {classes.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </Modal>

      {/* ---------------- FICHE INDIVIDUELLE ---------------- */}
      <Modal open={detailId !== null} title="Fiche de l'élève" onClose={() => setDetailId(null)} wide>
        {detailId && <StudentSheet studentId={detailId} onClose={() => setDetailId(null)} />}
      </Modal>

      {/* ---------------- CONFIRMATION ---------------- */}
      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cet élève ?"
        message={toDelete ? `${fullName(toDelete)} (${toDelete.classe}) et tout son historique (absences, retards, permissions, maladies, discipline) seront définitivement supprimés.` : ""}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await deleteStudent(toDelete.id);
          setToDelete(null);
        }}
      />

      {/* Astuce de tri visible pour l'utilisateur */}
      <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-400">
        <ArrowUpDown size={12} /> Touchez une ligne pour ouvrir la fiche · tri : {sortKey} ({sortAsc ? "A→Z" : "Z→A"})
      </p>
    </div>
  );
}
