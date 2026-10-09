/* =========================================================================
   Statistics.tsx — STATISTIQUES & GRAPHIQUES
   -------------------------------------------------------------------------
   Vue détaillée : classe par classe, mois par mois, avec export CSV.
   ========================================================================= */

import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useApp } from "../store/AppStore";
import { absencesByClass, classList, computeDashboard, disciplineByGravity, genderSplit, incidentsByType, monthlySeries, retardsByClass } from "../lib/stats";
import { exportCsvFile } from "../lib/backup";
import { formatNumber, todayISO } from "../lib/format";
import { ChartCard } from "../components/ChartCard";
import { Button, Card, EmptyState, PageHeader, StatCard, Table, Td, Tr, Field, inputClass } from "../components/ui";
import { GRAVITY_LABELS, type Gravity } from "../lib/types";

export default function Statistics() {
  const { db, notify } = useApp();
  const [monthsCount, setMonthsCount] = useState(8);

  const classes = classList(db.students);
  const stats = useMemo(() => computeDashboard(db, todayISO()), [db]);
  const months = useMemo(() => monthlySeries(db, monthsCount), [db, monthsCount]);
  const absencesClasse = useMemo(() => absencesByClass(db), [db]);
  const retardsClasse = useMemo(() => retardsByClass(db), [db]);
  const gravites = useMemo(() => disciplineByGravity(db), [db]);
  const types = useMemo(() => incidentsByType(db), [db]);
  const genres = useMemo(() => genderSplit(db.students), [db.students]);

  /* Tableau croisé : une ligne par classe. */
  const perClass = useMemo(
    () =>
      classes.map((classe) => {
        const ids = new Set(db.students.filter((student) => student.classe === classe).map((student) => student.id));
        const count = (rows: { studentId: string }[]) => rows.filter((row) => ids.has(row.studentId)).length;
        const effectif = ids.size;
        const absences = count(db.attendance);
        return {
          classe,
          effectif,
          absences,
          retards: count(db.lateness),
          permissions: count(db.permissions),
          maladies: count(db.illness),
          discipline: count(db.discipline),
          taux: effectif ? Math.max(0, Math.round((1 - absences / (effectif * 20)) * 100)) : 100,
        };
      }),
    [classes, db]
  );

  const exportCsv = () => {
    if (!perClass.length) return notify("Aucune donnée statistique.", "error");
    exportCsvFile(
      `statistiques-${todayISO()}.csv`,
      ["Classe", "Effectif", "Absences", "Retards", "Permissions", "Maladies", "Discipline", "Taux de présence estimé (%)"],
      perClass.map((row) => [row.classe, row.effectif, row.absences, row.retards, row.permissions, row.maladies, row.discipline, row.taux])
    );
    notify("Statistiques exportées en CSV.");
  };

  if (!db.students.length) {
    return (
      <div>
        <PageHeader title="📊 Statistiques" />
        <EmptyState title="Aucune donnée" message="Ajoutez des élèves pour voir apparaître les statistiques et les graphiques." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="📊 Statistiques"
        subtitle="Tout est calculé automatiquement à partir des données locales"
        actions={
          <Button variant="secondary" icon={<FileSpreadsheet size={16} />} onClick={exportCsv}>
            Exporter CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Effectif actif" value={formatNumber(stats.total)} />
        <StatCard label="Taux de présence" value={`${stats.tauxPresence}%`} tone="green" />
        <StatCard label="Incidents" value={formatNumber(stats.incidents)} tone="amber" />
        <StatCard label="Sanctions" value={formatNumber(stats.sanctions)} tone="red" />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Field label={`Période analysée : ${monthsCount} derniers mois`}>
          <input type="range" min={3} max={12} value={monthsCount} className={inputClass} onChange={(event) => setMonthsCount(Number(event.target.value))} />
        </Field>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard
          title="Absences et retards par mois"
          type="bar"
          labels={months.map((month) => month.label)}
          series={[
            { label: "Absences", values: months.map((month) => month.absences) },
            { label: "Retards", values: months.map((month) => month.retards) },
          ]}
        />
        <ChartCard title="Évolution des incidents disciplinaires" type="line" labels={months.map((month) => month.label)} values={months.map((month) => month.incidents)} colors={["#ef4444"]} />
        <ChartCard title="Absences par classe" type="bar" labels={absencesClasse.labels} values={absencesClasse.values} />
        <ChartCard title="Retards par classe" type="bar" labels={retardsClasse.labels} values={retardsClasse.values} colors={["#f59e0b"]} />
        <ChartCard title="Répartition garçons / filles" type="pie" labels={genres.labels} values={genres.values} colors={["#1d4ed8", "#8b5cf6"]} />
        <ChartCard
          title="Répartition par gravité"
          type="polarArea"
          labels={gravites.labels.map((key) => GRAVITY_LABELS[key as Gravity])}
          values={gravites.values}
        />
        <ChartCard title="Types d'incidents les plus fréquents" type="bar" labels={types.labels.slice(0, 8)} values={types.values.slice(0, 8)} colors={["#0ea5e9"]} className="lg:col-span-2" />
      </div>

      <Card className="mt-4" title="Détail par classe" subtitle="Effectif, événements et taux de présence estimé">
        <Table head={["Classe", "Effectif", "Absences", "Retards", "Permissions", "Maladies", "Discipline", "Taux est."]}>
          {perClass.map((row) => (
            <Tr key={row.classe}>
              <Td className="text-[13px] font-bold">{row.classe}</Td>
              <Td>{row.effectif}</Td>
              <Td>
                <span className="font-bold text-red-600">{row.absences}</span>
              </Td>
              <Td>
                <span className="font-bold text-amber-600">{row.retards}</span>
              </Td>
              <Td>{row.permissions}</Td>
              <Td>{row.maladies}</Td>
              <Td>{row.discipline}</Td>
              <Td>
                <span className={`font-bold ${row.taux >= 90 ? "text-emerald-600" : row.taux >= 75 ? "text-amber-600" : "text-red-600"}`}>{row.taux}%</span>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
