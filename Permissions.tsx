/* =========================================================================
   Permissions.tsx — MODULE PERMISSIONS (sorties pendant les cours)
   ========================================================================= */

import { formatDate, formatNumber, todayISO } from "../lib/format";
import { EventModule, MiniStat, type EventColumn, type EventField } from "../components/EventModule";
import type { Row } from "../components/EventModule";

const fields: EventField[] = [
  { name: "date", label: "Date", type: "date", required: true },
  { name: "heureSortie", label: "Heure de sortie", type: "time" },
  { name: "heureRetour", label: "Heure prévue de retour", type: "time" },
  {
    name: "motif",
    label: "Motif de la sortie",
    type: "select",
    options: [
      { value: "Rendez-vous médical", label: "Rendez-vous médical" },
      { value: "Affaire familiale", label: "Affaire familiale" },
      { value: "Démarche administrative", label: "Démarche administrative" },
      { value: "Autre", label: "Autre" },
    ],
  },
  { name: "autorisePar", label: "Personne autorisant la sortie", type: "text", placeholder: "Ex : Le directeur" },
  { name: "observation", label: "Observation", type: "textarea", wide: true },
];

const columns: EventColumn[] = [
  { label: "Date", render: (row) => <span className="text-[13px] font-semibold">{formatDate(String(row.date))}</span> },
  { label: "Sortie → Retour", render: (row) => <span className="text-[13px]">{String(row.heureSortie || "—")} → {String(row.heureRetour || "—")}</span> },
  { label: "Motif", field: "motif" },
  { label: "Autorisée par", field: "autorisePar" },
];

export default function Permissions() {
  const today = todayISO();

  const stats = (rows: Row[]) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <MiniStat label="Permissions (période)" value={formatNumber(rows.length)} />
      <MiniStat label="Aujourd'hui" value={formatNumber(rows.filter((row) => row.date === today).length)} tone="amber" />
      <MiniStat label="Sans heure de retour" value={formatNumber(rows.filter((row) => !row.heureRetour).length)} tone="red" />
    </div>
  );

  return <EventModule store="permissions" title="Permissions" emoji="📝" subtitle="Sorties autorisées pendant les heures de cours" fields={fields} columns={columns} reportKind="permissions" idPrefix="pm_" stats={stats} />;
}
