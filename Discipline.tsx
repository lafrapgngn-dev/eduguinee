/* =========================================================================
   Discipline.tsx — MODULE DISCIPLINE (incidents & sanctions)
   Quatre niveaux de gravité :
     observation < avertissement < incident < sanction
   ========================================================================= */

import { formatDate, formatNumber, todayISO } from "../lib/format";
import { Badge } from "../components/ui";
import { EventModule, MiniStat, type EventColumn, type EventField } from "../components/EventModule";
import type { Row } from "../components/EventModule";
import { GRAVITY_LABELS, type Gravity } from "../lib/types";

const fields: EventField[] = [
  { name: "date", label: "Date des faits", type: "date", required: true },
  {
    name: "gravite",
    label: "Niveau de gravité",
    type: "select",
    options: [
      { value: "observation", label: "Observation" },
      { value: "avertissement", label: "Avertissement" },
      { value: "incident", label: "Incident" },
      { value: "sanction", label: "Sanction" },
    ],
  },
  {
    name: "type",
    label: "Type d'incident",
    type: "select",
    options: [
      { value: "Bavardage", label: "Bavardage / agitation" },
      { value: "Retard répété", label: "Retard répété" },
      { value: "Absence non justifiée", label: "Absence non justifiée" },
      { value: "Tricherie", label: "Tricherie" },
      { value: "Bagarre", label: "Bagarre / violence" },
      { value: "Manque de respect", label: "Manque de respect" },
      { value: "Téléphone en classe", label: "Téléphone en classe" },
      { value: "Sortie non autorisée", label: "Sortie non autorisée" },
      { value: "Autre", label: "Autre" },
    ],
  },
  { name: "description", label: "Description des faits", type: "textarea", placeholder: "Décrire les faits de façon factuelle…", wide: true },
  {
    name: "mesure",
    label: "Mesure prise",
    type: "select",
    options: [
      { value: "Rappel au règlement", label: "Rappel au règlement" },
      { value: "Travail d'intérêt scolaire", label: "Travail d'intérêt scolaire" },
      { value: "Convocation des parents", label: "Convocation des parents" },
      { value: "Exclusion temporaire", label: "Exclusion temporaire" },
      { value: "Aucune", label: "Aucune" },
    ],
  },
  { name: "sanction", label: "Sanction (si applicable)", type: "text", placeholder: "Ex : 2 jours d'exclusion" },
  { name: "responsable", label: "Responsable ayant enregistré", type: "text", placeholder: "Ex : Surveillant général" },
  { name: "observation", label: "Observation", type: "textarea", wide: true },
];

const gravityTone: Record<Gravity, "slate" | "amber" | "blue" | "red"> = {
  observation: "slate",
  avertissement: "amber",
  incident: "blue",
  sanction: "red",
};

const columns: EventColumn[] = [
  { label: "Date", render: (row) => <span className="text-[13px] font-semibold">{formatDate(String(row.date))}</span> },
  { label: "Type", field: "type" },
  { label: "Gravité", render: (row) => <Badge tone={gravityTone[(row.gravite as Gravity) ?? "observation"]}>{GRAVITY_LABELS[(row.gravite as Gravity) ?? "observation"]}</Badge> },
  { label: "Mesure", field: "mesure" },
  { label: "Sanction", field: "sanction" },
];

export default function Discipline() {
  const today = todayISO();

  const stats = (rows: Row[]) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <MiniStat label="Faits (période)" value={formatNumber(rows.length)} />
      <MiniStat label="Aujourd'hui" value={formatNumber(rows.filter((row) => row.date === today).length)} tone="amber" />
      <MiniStat label="Incidents" value={formatNumber(rows.filter((row) => row.gravite === "incident").length)} tone="blue" />
      <MiniStat label="Sanctions" value={formatNumber(rows.filter((row) => row.gravite === "sanction").length)} tone="red" />
    </div>
  );

  return <EventModule store="discipline" title="Discipline" emoji="⚠️" subtitle="Incidents disciplinaires et sanctions" fields={fields} columns={columns} reportKind="discipline" idPrefix="dc_" stats={stats} />;
}
