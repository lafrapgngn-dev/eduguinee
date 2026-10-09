/* =========================================================================
   Search.tsx — RECHERCHE AVANCÉE
   -------------------------------------------------------------------------
   Les résultats se mettent à jour INSTANTANÉMENT : on n'appuie pas
   obligatoirement sur « RECHERCHER », le calcul se refait à chaque frappe
   (grâce à useMemo). Le bouton sert surtout de repère visuel.
   ========================================================================= */

import { useMemo, useState } from "react";
import { RotateCcw, Search as SearchIcon, FileDown } from "lucide-react";
import { useApp } from "../store/AppStore";
import { EMPTY_CRITERIA, countActiveCriteria, runSearch, type SearchCriteria } from "../lib/search";
import { classList } from "../lib/stats";
import { exportCsvFile } from "../lib/backup";
import { buildReport } from "../lib/pdf";
import { formatNumber, fullName, initials, todayISO } from "../lib/format";
import { Avatar, Badge, Button, Card, EmptyState, Field, PageHeader, Table, Td, Tr, inputClass } from "../components/ui";
import { STATUS_LABELS, type Sexe, type StudentStatus } from "../lib/types";

export default function Search({ onOpenStudent }: { onOpenStudent: (id: string) => void }) {
  const { db, settings, notify } = useApp();
  const [criteria, setCriteria] = useState<SearchCriteria>(EMPTY_CRITERIA);
  const [submitted, setSubmitted] = useState(false);

  const classes = classList(db.students);
  const active = countActiveCriteria(criteria);

  /* Résultats recalculés automatiquement. */
  const results = useMemo(() => runSearch(db, criteria), [db, criteria]);

  const set = (patch: Partial<SearchCriteria>) => setCriteria((current) => ({ ...current, ...patch }));
  const toggle = (key: "absent" | "retard" | "permission" | "malade" | "sanction") => setCriteria((current) => ({ ...current, [key]: !current[key] }));

  const reset = () => {
    setCriteria(EMPTY_CRITERIA);
    setSubmitted(false);
  };

  const periode = criteria.dateDebut || criteria.dateFin ? `Période : ${criteria.dateDebut || "…"} au ${criteria.dateFin || "…"}` : "Période : toutes dates";

  const exportCsv = () => {
    if (!results.length) return notify("Aucun résultat à exporter.", "error");
    exportCsvFile(
      `recherche-${todayISO()}.csv`,
      ["Matricule", "Nom", "Prénom", "Classe", "Sexe", "Statut", "Absences", "Retards", "Permissions", "Maladies", "Sanctions"],
      results.map((row) => [
        row.student.matricule,
        row.student.nom,
        row.student.prenom,
        row.student.classe,
        row.student.sexe,
        STATUS_LABELS[row.student.statut],
        row.absences,
        row.retards,
        row.permissions,
        row.maladies,
        row.sanctions,
      ])
    );
    notify("Résultats exportés en CSV.");
  };

  return (
    <div>
      <PageHeader
        title="🔍 Recherche avancée"
        subtitle="Combinez plusieurs critères : nom, classe, sexe, situation et période"
        actions={
          <>
            <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={reset}>
              Réinitialiser
            </Button>
            <Button icon={<FileDown size={16} />} onClick={exportCsv}>
              Exporter
            </Button>
          </>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nom / prénom / matricule" className="sm:col-span-2">
            <input className={inputClass} placeholder="Ex : DIALLO" value={criteria.text} onChange={(event) => set({ text: event.target.value })} />
          </Field>
          <Field label="Classe">
            <select className={inputClass} value={criteria.classe} onChange={(event) => set({ classe: event.target.value })}>
              <option value="">Toutes</option>
              {classes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sexe">
            <select className={inputClass} value={criteria.sexe} onChange={(event) => set({ sexe: event.target.value as Sexe })}>
              <option value="">Tous</option>
              <option value="M">Garçons</option>
              <option value="F">Filles</option>
            </select>
          </Field>
          <Field label="Statut">
            <select className={inputClass} value={criteria.statut} onChange={(event) => set({ statut: event.target.value as StudentStatus })}>
              <option value="">Tous</option>
              {(Object.keys(STATUS_LABELS) as StudentStatus[]).map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABELS[key]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date de début">
            <input type="date" className={inputClass} value={criteria.dateDebut} onChange={(event) => set({ dateDebut: event.target.value })} />
          </Field>
          <Field label="Date de fin">
            <input type="date" className={inputClass} value={criteria.dateFin} onChange={(event) => set({ dateFin: event.target.value })} />
          </Field>
        </div>

        <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Situation de l'élève (sur la période)</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["absent", "Absent"],
              ["retard", "Retard"],
              ["permission", "Permission"],
              ["malade", "Malade"],
              ["sanction", "Sanctionné"],
            ] as [keyof SearchCriteria, string][]
          ).map(([key, label]) => {
            const checked = Boolean(criteria[key]);
            return (
              <button
                key={String(key)}
                onClick={() => toggle(key as "absent")}
                className={`min-h-[40px] rounded-full border px-4 text-xs font-bold transition-colors ${
                  checked ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {checked ? "☑" : "☐"} {label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button icon={<SearchIcon size={16} />} onClick={() => setSubmitted(true)}>
            Rechercher
          </Button>
          <span className="text-xs text-slate-500 dark:text-slate-400">{active} critère(s) actif(s) · résultats instantanés</span>
        </div>
      </Card>

      {/* ---------------- RÉSULTATS ---------------- */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatNumber(results.length)} élève(s) trouvé(s)</h2>
            <p className="text-[11px] text-slate-500">{periode}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              if (!results.length) return notify("Aucun résultat.", "error");
              buildReport({ kind: "students", db, settings, periode });
            }}
          >
            PDF
          </Button>
        </header>

        {results.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={36} />}
            title={submitted ? "Aucun résultat" : "Prêt à rechercher"}
            message={submitted ? "Essayez d'élargir vos critères (classe, période, situations)." : "Renseignez un ou plusieurs critères : les résultats s'affichent automatiquement."}
          />
        ) : (
          <Table head={["Élève", "Matricule", "Classe", "Sexe", "Abs.", "Ret.", "Perm.", "Mal.", "Sanc."]}>
            {results.slice(0, 150).map((row) => (
              <Tr key={row.student.id} onClick={() => onOpenStudent(row.student.id)}>
                <Td>
                  <div className="flex items-center gap-2">
                    <Avatar photo={row.student.photo} text={initials(row.student)} size={30} />
                    <span className="text-[13px] font-bold">{fullName(row.student)}</span>
                  </div>
                </Td>
                <Td className="text-[12px]">{row.student.matricule}</Td>
                <Td className="text-[12px]">{row.student.classe}</Td>
                <Td>
                  <Badge tone={row.student.sexe === "M" ? "blue" : "violet"}>{row.student.sexe}</Badge>
                </Td>
                <Td>
                  <Badge tone={row.absences ? "red" : "slate"}>{row.absences}</Badge>
                </Td>
                <Td>
                  <Badge tone={row.retards ? "amber" : "slate"}>{row.retards}</Badge>
                </Td>
                <Td>
                  <Badge tone={row.permissions ? "blue" : "slate"}>{row.permissions}</Badge>
                </Td>
                <Td>
                  <Badge tone={row.maladies ? "violet" : "slate"}>{row.maladies}</Badge>
                </Td>
                <Td>
                  <Badge tone={row.sanctions ? "red" : "slate"}>{row.sanctions}</Badge>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
