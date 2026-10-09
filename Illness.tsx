/* =========================================================================
   Illness.tsx — MODULE MALADIES
   NB : on ne collecte AUCUNE donnée médicale sensible (pas de diagnostic),
   uniquement ce dont le surveillant a besoin pour agir.
   ========================================================================= */

import { formatDate, formatNumber, todayISO } from "../lib/format";
import { EventModule, MiniStat, YesNo, type EventColumn, type EventField } from "../components/EventModule";
import type { Row } from "../components/EventModule";

const fields: EventField[] = [
  { name: "date", label: "Date", type: "date", required: true },
  { name: "heure", label: "Heure", type: "time" },
  {
    name: "motif",
    label: "Motif général",
    type: "select",
    options: [
      { value: "Malaise", label: "Malaise" },
      { value: "Céphalées", label: "Céphalées (maux de tête)" },
      { value: "Fièvre apparente", label: "Fièvre apparente" },
      { value: "Douleurs abdominales", label: "Douleurs abdominales" },
      { value: "Blessure légère", label: "Blessure légère" },
      { value: "Autre", label: "Autre" },
    ],
  },
  {
    name: "priseEnCharge",
    label: "Prise en charge",
    type: "select",
    options: [
      { value: "Repos à l'infirmerie", label: "Repos à l'infirmerie" },
      { value: "Renvoyé chez les parents", label: "Renvoyé chez les parents" },
      { value: "Orientation centre de santé", label: "Orientation centre de santé" },
      { value: "Simple surveillance", label: "Simple surveillance" },
    ],
  },
  { name: "parentContacte", label: "Parent / tuteur contacté ?", type: "checkbox", placeholder: "Oui, parent informé" },
  { name: "observation", label: "Observation", type: "textarea", wide: true },
];

const columns: EventColumn[] = [
  { label: "Date", render: (row) => <span className="text-[13px] font-semibold">{formatDate(String(row.date))}</span> },
  { label: "Heure", field: "heure" },
  { label: "Motif", field: "motif" },
  { label: "Prise en charge", field: "priseEnCharge" },
  { label: "Parent contacté", render: (row) => <YesNo value={row.parentContacte} /> },
];

export default function Illness() {
  const today = todayISO();

  const stats = (rows: Row[]) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <MiniStat label="Cas (période)" value={formatNumber(rows.length)} />
      <MiniStat label="Aujourd'hui" value={formatNumber(rows.filter((row) => row.date === today).length)} tone="amber" />
      <MiniStat label="Parents contactés" value={formatNumber(rows.filter((row) => row.parentContacte).length)} tone="green" />
    </div>
  );

  return <EventModule store="illness" title="Cas de maladie" emoji="🩺" subtitle="Élèves déclarés malades et prise en charge" fields={fields} columns={columns} reportKind="illness" idPrefix="ml_" stats={stats} />;
}
