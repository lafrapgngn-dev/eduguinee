/* =========================================================================
   Attendance.tsx — MODULE ABSENCES
   Configuration du module générique : champs du formulaire + colonnes.
   ========================================================================= */

import { formatDate, formatNumber, todayISO } from "../lib/format";
import { EventModule, MiniStat, YesNo, type EventColumn, type EventField } from "../components/EventModule";
import type { Row } from "../components/EventModule";

const fields: EventField[] = [
  { name: "date", label: "Date de l'absence", type: "date", required: true },
  {
    name: "motif",
    label: "Motif",
    type: "select",
    options: [
      { value: "Maladie", label: "Maladie" },
      { value: "Raison familiale", label: "Raison familiale" },
      { value: "Non justifiée", label: "Non justifiée" },
      { value: "Transport", label: "Problème de transport" },
      { value: "Autre", label: "Autre" },
    ],
  },
  { name: "justifiee", label: "Absence justifiée ?", type: "checkbox", placeholder: "Oui, justificatif reçu" },
  { name: "observation", label: "Observation", type: "textarea", placeholder: "Informations complémentaires…", wide: true },
];

const columns: EventColumn[] = [
  { label: "Date", render: (row) => <span className="text-[13px] font-semibold">{formatDate(String(row.date))}</span> },
  { label: "Motif", field: "motif" },
  { label: "Justifiée", render: (row) => <YesNo value={row.justifiee} /> },
  { label: "Observation", field: "observation" },
];

export default function Attendance() {
  const today = todayISO();

  const stats = (rows: Row[]) => {
    const todayRows = rows.filter((row) => row.date === today);
    const justifiees = rows.filter((row) => row.justifiee).length;
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Absences (période)" value={formatNumber(rows.length)} />
        <MiniStat label="Aujourd'hui" value={formatNumber(todayRows.length)} tone="amber" />
        <MiniStat label="Justifiées" value={formatNumber(justifiees)} tone="green" />
        <MiniStat label="Non justifiées" value={formatNumber(rows.length - justifiees)} tone="red" />
      </div>
    );
  };

  return <EventModule store="attendance" title="Absences" emoji="📋" subtitle="Enregistrement et suivi des absences" fields={fields} columns={columns} reportKind="absences" idPrefix="ab_" stats={stats} />;
}
