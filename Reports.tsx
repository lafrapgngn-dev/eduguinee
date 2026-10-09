/* =========================================================================
   Reports.tsx — RAPPORTS PDF
   -------------------------------------------------------------------------
   L'utilisateur choisit : le type de rapport, la période, la classe et
   éventuellement un élève. Le PDF est construit sur l'appareil (jsPDF),
   sans Internet, puis téléchargé / partagé.
   ========================================================================= */

import { useMemo, useState } from "react";
import { FileDown, FileText } from "lucide-react";
import { useApp } from "../store/AppStore";
import { buildReport, REPORT_LABELS, type ReportKind } from "../lib/pdf";
import { exportCsvFile } from "../lib/backup";
import { classList, computeDashboard, monthlySeries } from "../lib/stats";
import { firstDayOfMonth, formatDate, formatNumber, fullName, lastDayOfMonth, todayISO } from "../lib/format";
import { Button, Callout, Card, Field, PageHeader, Table, Td, Tr, inputClass } from "../components/ui";

const ALL_REPORTS: { kind: ReportKind; emoji: string; description: string }[] = [
  { kind: "general", emoji: "🏫", description: "Synthèse du jour : effectifs, absents, retardataires, taux de présence." },
  { kind: "students", emoji: "👨‍🎓", description: "Liste complète des élèves avec parents et téléphones." },
  { kind: "absences", emoji: "📋", description: "Liste des absences sur la période choisie." },
  { kind: "lateness", emoji: "⏰", description: "Liste des retardataires avec heures d'arrivée." },
  { kind: "permissions", emoji: "📝", description: "Sorties autorisées pendant les cours." },
  { kind: "illness", emoji: "🩺", description: "Cas de maladie déclarés et prises en charge." },
  { kind: "discipline", emoji: "⚠️", description: "Incidents, mesures prises et sanctions." },
  { kind: "personnel", emoji: "👥", description: "Registre du personnel avec présence, fonction et horaires." },
  { kind: "monthly", emoji: "📊", description: "Statistiques mensuelles et par classe." },
  { kind: "student", emoji: "🧾", description: "Fiche individuelle avec historique complet." },
];

export default function Reports() {
  const { db, settings, notify } = useApp();
  const [kind, setKind] = useState<ReportKind>("general");
  const [dateDebut, setDateDebut] = useState(firstDayOfMonth());
  const [dateFin, setDateFin] = useState(lastDayOfMonth());
  const [classe, setClasse] = useState("");
  const [studentId, setStudentId] = useState("");

  const classes = classList(db.students);
  const students = useMemo(() => [...db.students].sort((a, b) => a.nom.localeCompare(b.nom)), [db.students]);
  const stats = computeDashboard(db, todayISO());
  const months = monthlySeries(db, 6);

  const periode = `Période : ${formatDate(dateDebut)} au ${formatDate(dateFin)}`;

  const generate = () => {
    if (kind === "student" && !studentId) {
      notify("Choisissez d'abord un élève pour la fiche individuelle.", "error");
      return;
    }
    buildReport({ kind, db, settings, periode, dateDebut, dateFin, classe: classe || undefined, studentId: studentId || undefined });
    notify("PDF généré avec succès.");
  };

  const exportCsv = () => {
    exportCsvFile(
      `rapport-${kind}-${todayISO()}.csv`,
      ["Indicateur", "Valeur"],
      [
        ["Établissement", settings.schoolName],
        ["Année scolaire", settings.schoolYear],
        ["Élèves actifs", stats.total],
        ["Garçons", stats.garcons],
        ["Filles", stats.filles],
        ["Absents du jour", stats.absentsToday],
        ["Retards du jour", stats.retardsToday],
        ["Permissions du jour", stats.permissionsToday],
        ["Cas de maladie du jour", stats.maladesToday],
        ["Taux de présence (%)", stats.tauxPresence],
        ["Incidents", stats.incidents],
        ["Sanctions", stats.sanctions],
      ]
    );
    notify("Rapport exporté en CSV.");
  };

  return (
    <div>
      <PageHeader
        title="📄 Rapports PDF"
        subtitle="Génération locale, sans Internet — le fichier est créé sur l'appareil"
        actions={<Button icon={<FileDown size={16} />} onClick={generate}>Générer le PDF</Button>}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* --------- Choix du rapport --------- */}
        <Card className="lg:col-span-2" title="1. Choisir un rapport">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ALL_REPORTS.map((report) => (
              <button
                key={report.kind}
                onClick={() => setKind(report.kind)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  kind === report.kind ? "border-blue-700 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                }`}
              >
                <p className="flex items-center gap-2 text-[13px] font-bold text-slate-800 dark:text-slate-100">
                  <span>{report.emoji}</span> {REPORT_LABELS[report.kind]}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{report.description}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* --------- Options --------- */}
        <div className="space-y-3">
          <Card title="2. Options">
            <div className="space-y-3">
              <Field label="Date de début">
                <input type="date" className={inputClass} value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} />
              </Field>
              <Field label="Date de fin">
                <input type="date" className={inputClass} value={dateFin} onChange={(event) => setDateFin(event.target.value)} />
              </Field>
              <Field label="Classe (facultatif)">
                <select className={inputClass} value={classe} onChange={(event) => setClasse(event.target.value)}>
                  <option value="">Toutes les classes</option>
                  {classes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              {kind === "student" && (
                <Field label="Élève concerné">
                  <select className={inputClass} value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                    <option value="">— Choisir un élève —</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {fullName(student)} — {student.classe}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Button full icon={<FileDown size={16} />} onClick={generate}>
                Générer le PDF
              </Button>
            </div>
          </Card>

          <Callout tone="amber">
            Le PDF contient : le nom de l'établissement, l'année scolaire, le surveillant, le titre, la période, le tableau des données et la date de génération. Modifiez ces informations dans
            <strong> Paramètres</strong>.
          </Callout>
        </div>
      </div>

      {/* --------- Aperçu des chiffres --------- */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Aperçu — indicateurs du jour" actions={<Button variant="ghost" onClick={exportCsv}>CSV</Button>}>
          <Table head={["Indicateur", "Valeur"]}>
            {[
              ["Élèves actifs", formatNumber(stats.total)],
              ["Garçons / Filles", `${stats.garcons} / ${stats.filles}`],
              ["Absents aujourd'hui", formatNumber(stats.absentsToday)],
              ["Retardataires aujourd'hui", formatNumber(stats.retardsToday)],
              ["Permissions aujourd'hui", formatNumber(stats.permissionsToday)],
              ["Taux de présence", `${stats.tauxPresence} %`],
              ["Incidents / Sanctions", `${stats.incidents} / ${stats.sanctions}`],
            ].map(([label, value]) => (
              <Tr key={label}>
                <Td className="text-[13px]">{label}</Td>
                <Td className="text-[13px] font-bold">{value}</Td>
              </Tr>
            ))}
          </Table>
        </Card>

        <Card title="Aperçu — 6 derniers mois" subtitle="Absences, retards et incidents">
          <Table head={["Mois", "Absences", "Retards", "Incidents"]}>
            {months.map((month) => (
              <Tr key={month.key}>
                <Td className="text-[13px] font-bold">{month.label}</Td>
                <Td className="text-[13px] text-red-600">{month.absences}</Td>
                <Td className="text-[13px] text-amber-600">{month.retards}</Td>
                <Td className="text-[13px] text-violet-600">{month.incidents}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      </div>

      <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-400">
        <FileText size={12} /> {db.students.length} élèves · {db.attendance.length} absences · {db.discipline.length} faits disciplinaires disponibles
      </p>
    </div>
  );
}
