/* =========================================================================
   Lateness.tsx — MODULE RETARDS
   ========================================================================= */

import { formatDate, formatNumber, todayISO } from "../lib/format";
import { EventModule, MiniStat, type EventColumn, type EventField } from "../components/EventModule";
import type { Row } from "../components/EventModule";

const fields: EventField[] = [
  { name: "date", label: "Date", type: "date", required: true },
  { name: "heure", label: "Heure d'arrivée", type: "time", placeholder: "08:25" },
  {
    name: "motif",
    label: "Motif",
    type: "select",
    options: [
      { value: "Transport", label: "Transport" },
      { value: "Réveil tardif", label: "Réveil tardif" },
      { value: "Travaux domestiques", label: "Travaux domestiques" },
      { value: "Non justifié", label: "Non justifié" },
      { value: "Autre", label: "Autre" },
    ],
  },
  { name: "justificatif", label: "Justificatif présenté", type: "text", placeholder: "Ex : billet de bus" },
  { name: "observation", label: "Observation", type: "textarea", wide: true },
];

const columns: EventColumn[] = [
  { label: "Date", render: (row) => <span className="text-[13px] font-semibold">{formatDate(String(row.date))}</span> },
  { label: "Heure", field: "heure" },
  { label: "Motif", field: "motif" },
  { label: "Justificatif", field: "justificatif" },
];

export default function Lateness() {
  const today = todayISO();

  const stats = (rows: Row[]) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <MiniStat label="Retards (période)" value={formatNumber(rows.length)} />
      <MiniStat label="Aujourd'hui" value={formatNumber(rows.filter((row) => row.date === today).length)} tone="amber" />
      <MiniStat label="Avec justificatif" value={formatNumber(rows.filter((row) => row.justificatif).length)} tone="green" />
      <MiniStat label="Sans justificatif" value={formatNumber(rows.filter((row) => !row.justificatif).length)} tone="red" />
    </div>
  );

  return <EventModule store="lateness" title="Retards" emoji="⏰" subtitle="Heures d'arrivée tardive des élèves" fields={fields} columns={columns} reportKind="lateness" idPrefix="rt_" stats={stats} />;
}
