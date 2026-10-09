/* =========================================================================
   Dashboard.tsx — TABLEAU DE BORD
   -------------------------------------------------------------------------
   Tout est calculé automatiquement depuis les données locales :
     - cartes de chiffres (src/lib/stats.ts -> computeDashboard)
     - graphiques (ChartCard + Chart.js)
     - liste des élèves les plus absents
   Dès qu'une donnée change dans la base, tout se met à jour.
   ========================================================================= */

import { useMemo } from "react";
import { CalendarX, Clock, FileSearch, ShieldAlert, Stethoscope, UserCheck, Users, FileDown } from "lucide-react";
import { useApp } from "../store/AppStore";
import { absencesByClass, computeDashboard, monthlySeries, genderSplit, retardsByClass, incidentsByType, topAbsentStudents } from "../lib/stats";
import { formatDate, formatNumber, fullName, todayISO } from "../lib/format";
import { ChartCard } from "../components/ChartCard";
import { Badge, Button, Card, EmptyState, PageHeader, StatCard, Table, Td, Tr } from "../components/ui";
import type { PageId } from "../components/nav";

export default function Dashboard({ onNavigate, onOpenStudent }: { onNavigate: (page: PageId) => void; onOpenStudent: (id: string) => void }) {
  const { db, settings, online } = useApp();
  const today = todayISO();

  const stats = useMemo(() => computeDashboard(db, today), [db, today]);
  const months = useMemo(() => monthlySeries(db, 8), [db]);
  const absencesClasse = useMemo(() => absencesByClass(db), [db]);
  const retardsClasse = useMemo(() => retardsByClass(db), [db]);
  const genres = useMemo(() => genderSplit(db.students), [db.students]);
  const incidents = useMemo(() => incidentsByType(db), [db]);
  const topAbsents = useMemo(() => topAbsentStudents(db, 5), [db]);

  const absentsToday = useMemo(() => {
    const ids = new Set(db.attendance.filter((row) => row.date === today).map((row) => row.studentId));
    return db.students.filter((student) => ids.has(student.id)).slice(0, 8);
  }, [db, today]);

  const heroMetrics = [
    { label: "Présence", value: `${stats.tauxPresence}%`, tone: "emerald" },
    { label: "Absences", value: formatNumber(stats.absentsToday), tone: "red" },
    { label: "Retards", value: formatNumber(stats.retardsToday), tone: "amber" },
  ];

  return (
    <div>
      <PageHeader
        title="🏠 Tableau de bord"
        subtitle={`${settings.schoolName} · ${formatDate(today)} · Année ${settings.schoolYear}`}
        actions={
          <>
            <Button variant="secondary" icon={<FileSearch size={16} />} onClick={() => onNavigate("search")}>
              Recherche
            </Button>
            <Button icon={<FileDown size={16} />} onClick={() => onNavigate("reports")}>
              Rapports
            </Button>
          </>
        }
      />

      <section className="premium-panel mb-4 overflow-hidden rounded-[28px] p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div className="rounded-[22px] bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.35)] sm:p-5">
            <div className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-200">
              Dashboard opérationnel
            </div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Pilotage de la vie scolaire</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-200/90">
              {online ? "Connexion active" : "Mode hors ligne actif"} — présence, retards et suivi du personnel restent visibles et exploitable en temps réel.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="blue">{stats.total} élèves</Badge>
              <Badge tone="green">{stats.garcons} garçons</Badge>
              <Badge tone="violet">{stats.filles} filles</Badge>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {heroMetrics.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className={`mt-2 text-2xl font-black ${item.tone === "emerald" ? "text-emerald-600 dark:text-emerald-300" : item.tone === "red" ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300"}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------- ÉTAT DU MODE HORS LIGNE --------- */}
      <div className={`mb-4 flex items-center gap-2 rounded-2xl p-3 text-xs font-bold ${online ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-blue-600" : "bg-emerald-600"}`} />
        {online ? "🔵 Connexion disponible — l'application continue de fonctionner localement." : "🟢 Application hors ligne prête — toutes vos données sont sur l'appareil."}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="!p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Actions rapides</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">Suivi de la journée</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <FileSearch size={18} />
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => onNavigate("attendance")}>Absences</Button>
            <Button variant="secondary" onClick={() => onNavigate("lateness")}>Retards</Button>
            <Button variant="secondary" onClick={() => onNavigate("discipline")}>Discipline</Button>
            <Button variant="secondary" onClick={() => onNavigate("personnel")}>Personnel</Button>
          </div>
        </Card>

        <Card className="!p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Alertes</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">Priorités du jour</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
              <ShieldAlert size={18} />
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-slate-800/70">
              <span>Absences</span>
              <strong className="text-red-600 dark:text-red-300">{stats.absentsToday}</strong>
            </li>
            <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-slate-800/70">
              <span>Retards</span>
              <strong className="text-amber-600 dark:text-amber-300">{stats.retardsToday}</strong>
            </li>
            <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-slate-800/70">
              <span>Incidents</span>
              <strong className="text-violet-600 dark:text-violet-300">{stats.incidents}</strong>
            </li>
          </ul>
        </Card>

        <Card className="!p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Performance</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">Présence du jour</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <UserCheck size={18} />
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-2">
            <div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.tauxPresence}%</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Taux de présence</p>
            </div>
            <div className="h-16 w-20 overflow-hidden rounded-xl bg-gradient-to-t from-emerald-500 to-emerald-200 p-1 dark:from-emerald-600 dark:to-emerald-300">
              <div className="h-full w-full rounded-lg bg-white/20" style={{ height: `${Math.max(25, stats.tauxPresence)}%` }} />
            </div>
          </div>
        </Card>
      </div>

      {/* --------- CARTES STATISTIQUES --------- */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Élèves actifs" value={formatNumber(stats.total)} icon={<Users size={18} />} tone="blue" hint={`${stats.garcons} G · ${stats.filles} F`} />
        <StatCard label="Taux de présence" value={`${stats.tauxPresence}%`} icon={<UserCheck size={18} />} tone="green" hint="Aujourd'hui" />
        <StatCard label="Absents du jour" value={formatNumber(stats.absentsToday)} icon={<CalendarX size={18} />} tone="red" hint="Absences enregistrées" />
        <StatCard label="Retards du jour" value={formatNumber(stats.retardsToday)} icon={<Clock size={18} />} tone="amber" />
        <StatCard label="Permissions du jour" value={formatNumber(stats.permissionsToday)} icon={<UserCheck size={18} />} tone="violet" />
        <StatCard label="Cas de maladie" value={formatNumber(stats.maladesToday)} icon={<Stethoscope size={18} />} tone="violet" hint="Aujourd'hui" />
        <StatCard label="Incidents" value={formatNumber(stats.incidents)} icon={<ShieldAlert size={18} />} tone="amber" hint="Historique complet" />
        <StatCard label="Sanctions" value={formatNumber(stats.sanctions)} icon={<ShieldAlert size={18} />} tone="red" hint="Historique complet" />
        <StatCard label="Garçons" value={formatNumber(stats.garcons)} icon={<Users size={18} />} tone="blue" />
        <StatCard label="Filles" value={formatNumber(stats.filles)} icon={<Users size={18} />} tone="violet" />
      </div>

      {/* --------- GRAPHIQUES --------- */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard
          title="Évolution des absences et retards"
          subtitle="8 derniers mois"
          type="line"
          labels={months.map((month) => month.label)}
          series={[
            { label: "Absences", values: months.map((month) => month.absences) },
            { label: "Retards", values: months.map((month) => month.retards) },
          ]}
        />
        <ChartCard title="Répartition garçons / filles" type="doughnut" labels={genres.labels} values={genres.values} colors={["#1d4ed8", "#8b5cf6"]} />
        <ChartCard title="Absences par classe" type="bar" labels={absencesClasse.labels} values={absencesClasse.values} />
        <ChartCard title="Retards par classe" type="bar" labels={retardsClasse.labels} values={retardsClasse.values} colors={["#f59e0b"]} />
        <ChartCard title="Incidents disciplinaires par type" type="bar" labels={incidents.labels} values={incidents.values} colors={["#ef4444"]} />
        <ChartCard
          title="Faits disciplinaires par mois"
          type="bar"
          labels={months.map((month) => month.label)}
          values={months.map((month) => month.incidents)}
          colors={["#8b5cf6"]}
        />
      </div>

      {/* --------- LISTES RAPIDES --------- */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Absents du jour" subtitle={formatDate(today)} actions={<Button variant="ghost" onClick={() => onNavigate("attendance")}>Tout voir</Button>}>
          {absentsToday.length === 0 ? (
            <EmptyState title="Aucun absent enregistré aujourd'hui" message="Enregistrez une absence depuis le module Absences." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {absentsToday.map((student) => (
                <li key={student.id} className="flex items-center justify-between gap-2 py-2">
                  <button className="min-w-0 text-left" onClick={() => onOpenStudent(student.id)}>
                    <p className="truncate text-[13px] font-bold">{fullName(student)}</p>
                    <p className="text-[11px] text-slate-500">{student.classe}</p>
                  </button>
                  <Badge tone="red">Absent</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Élèves les plus absents" subtitle="Sur l'ensemble de la période enregistrée">
          {topAbsents.length === 0 ? (
            <EmptyState title="Pas encore de données" message="Les absences enregistrées apparaîtront ici." />
          ) : (
            <Table head={["Élève", "Classe", "Absences"]}>
              {topAbsents.map((row) => (
                <Tr key={row.student!.id} onClick={() => onOpenStudent(row.student!.id)}>
                  <Td className="text-[13px] font-bold">{fullName(row.student)}</Td>
                  <Td className="text-[12px]">{row.student!.classe}</Td>
                  <Td>
                    <Badge tone="red">{row.count}</Badge>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
