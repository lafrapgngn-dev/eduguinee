/* =========================================================================
   StudentSheet.tsx — FICHE INDIVIDUELLE DE L'ÉLÈVE
   -------------------------------------------------------------------------
   Contenu :
     1. Photo + identité
     2. Statistiques (absences, retards, permissions, incidents, sanctions)
     3. Historique chronologique de tous les événements
     4. Bouton « Exporter la fiche en PDF »
   Les chiffres sont calculés par src/lib/stats.ts (studentSummary).
   ========================================================================= */

import { FileDown, Phone, MapPin, Cake } from "lucide-react";
import { useApp } from "../store/AppStore";
import { age, formatDate, fullName, formatNumber, initials } from "../lib/format";
import { studentHistory, studentSummary } from "../lib/stats";
import { exportStudentSheet } from "../lib/pdf";
import { Avatar, Badge, Button, EmptyState, Table, Td, Tr } from "./ui";
import { STATUS_LABELS } from "../lib/types";

function StatBox({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-xl border p-2 text-center ${tone}`}>
      <p className="text-lg font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

const historyTone = (type: string) =>
  type === "Absence" ? "red" : type === "Retard" ? "amber" : type === "Permission" ? "blue" : type === "Maladie" ? "violet" : "slate";

export function StudentSheet({ studentId, onClose }: { studentId: string; onClose?: () => void }) {
  const { db, settings, notify } = useApp();
  const student = db.students.find((item) => item.id === studentId);

  if (!student) {
    return <EmptyState title="Élève introuvable" message="Cette fiche n'existe plus dans la base locale." />;
  }

  const summary = studentSummary(db, student.id);
  const history = studentHistory(db, student.id);

  const exportPdf = () => {
    exportStudentSheet(student.id, db, settings);
    notify("Fiche PDF générée.");
  };

  return (
    <div className="space-y-4">
      {/* ---------------- IDENTITÉ ---------------- */}
      <div className="flex flex-wrap items-start gap-4 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-600 p-4 text-white">
        <Avatar photo={student.photo} text={initials(student)} size={72} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-extrabold">{fullName(student)}</h2>
          <p className="text-xs opacity-90">
            {student.classe} · {student.niveau || "Niveau non précisé"} · Matricule {student.matricule}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-white/20 px-2 py-0.5">Sexe : {student.sexe}</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5">{STATUS_LABELS[student.statut]}</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5">{age(student.dateNaissance)}</span>
          </div>
        </div>
      </div>

      {/* ---------------- COORDONNÉES ---------------- */}
      <div className="grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
          <Cake size={15} className="text-blue-600" /> Né(e) le {formatDate(student.dateNaissance)}
        </p>
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
          <Phone size={15} className="text-blue-600" /> {student.parentTelephone || "Téléphone non renseigné"}
        </p>
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
          <strong className="font-bold">Parent :</strong> {student.parentNom || "—"}
        </p>
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
          <MapPin size={15} className="text-blue-600" /> {student.adresse || "Adresse non renseignée"}
        </p>
      </div>

      {/* ---------------- STATISTIQUES ---------------- */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Statistiques</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <StatBox label="Absences" value={summary.absences} tone="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" />
          <StatBox label="Retards" value={summary.retards} tone="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300" />
          <StatBox label="Permissions" value={summary.permissions} tone="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300" />
          <StatBox label="Maladies" value={summary.maladies} tone="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300" />
          <StatBox label="Incidents" value={summary.incidents} tone="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
          <StatBox label="Sanctions" value={summary.sanctions} tone="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" />
        </div>
      </div>

      {/* ---------------- HISTORIQUE ---------------- */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Historique ({formatNumber(history.length)})</h3>
        {history.length === 0 ? (
          <EmptyState title="Aucun événement" message="Cet élève n'a aucun antécédent enregistré : absence, retard, permission, maladie ou discipline." />
        ) : (
          <div className="rounded-2xl border border-slate-200 py-2 dark:border-slate-800">
            <Table head={["Date", "Type", "Motif", "Observation"]}>
              {history.slice(0, 120).map((row) => (
                <Tr key={row.id}>
                  <Td className="whitespace-nowrap text-[12px] font-semibold">{formatDate(row.date)}</Td>
                  <Td>
                    <Badge tone={historyTone(row.type)}>{row.type}</Badge>
                  </Td>
                  <Td className="text-[12px]">{row.motif || "—"}</Td>
                  <Td className="text-[12px] text-slate-500">{row.observation || "—"}</Td>
                </Tr>
              ))}
            </Table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button icon={<FileDown size={16} />} onClick={exportPdf}>
          Exporter la fiche en PDF
        </Button>
        {onClose && (
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        )}
      </div>
    </div>
  );
}

/* La fiche est affichée dans une <Modal> par la page Élèves (voir Students.tsx). */
