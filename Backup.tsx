/* =========================================================================
   Backup.tsx — SAUVEGARDE LOCALE / RESTAURATION / EXPORT
   -------------------------------------------------------------------------
   Trois actions principales :
     💾 SAUVEGARDER   : range une copie des données dans la base locale.
     📤 EXPORTER      : télécharge un fichier .json (ou .csv).
     📥 RESTAURER     : relit un fichier .json et remplace les données.
   Une sauvegarde automatique est proposée (une fois par jour).
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { DatabaseBackup, Download, FileJson, HardDriveDownload, Save, Trash2, Upload } from "lucide-react";
import { useApp } from "../store/AppStore";
import { STORES, getAll } from "../lib/db";
import {
  createPayload,
  deleteLocalBackup,
  downloadFile,
  exportCsvFile,
  restoreFromPayload,
  saveBackupLocally,
  isValidPayload,
} from "../lib/backup";
import { formatDate, formatNumber, todayISO } from "../lib/format";
import { Avatar, Badge, Button, Callout, Card, ConfirmDialog, EmptyState, PageHeader, Table, Td, Toggle, Tr } from "../components/ui";
import { fullName, initials } from "../lib/format";
import type { BackupEntry } from "../lib/types";

const AUTO_FLAG = "sm_auto_backup";
const LAST_AUTO = "sm_last_auto_backup";

export default function Backup() {
  const { db, notify, reload, deleteBackup } = useApp();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<BackupEntry | null>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<unknown>(null);
  const [pendingWipe, setPendingWipe] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => setBackups(await getAll<BackupEntry>(STORES.backups));

  useEffect(() => {
    refresh().catch(() => notify("Impossible de lire les sauvegardes.", "error"));
    setAuto(localStorage.getItem(AUTO_FLAG) === "1");
  }, [notify]);

  /* ---------------- sauvegarde automatique (1 fois / jour) ---------------- */
  useEffect(() => {
    if (!auto || !db.students.length) return;
    const last = localStorage.getItem(LAST_AUTO);
    if (last === todayISO()) return;
    (async () => {
      await saveBackupLocally("Sauvegarde automatique");
      localStorage.setItem(LAST_AUTO, todayISO());
      await refresh();
      notify("Sauvegarde automatique effectuée.", "info");
    })();
  }, [auto, db.students.length, notify]);

  const total = db.students.length + db.attendance.length + db.lateness.length + db.permissions.length + db.illness.length + db.discipline.length + db.personnel.length;

  /* ---------------- actions ---------------- */
  const saveNow = async () => {
    setBusy(true);
    try {
      await saveBackupLocally();
      await refresh();
      notify("Sauvegarde enregistrée sur l'appareil.");
    } catch {
      notify("Échec de la sauvegarde.", "error");
    } finally {
      setBusy(false);
    }
  };

  const exportJson = async () => {
    const data = await createPayload();
    downloadFile(`surveillant-manager-${todayISO()}.json`, JSON.stringify(data, null, 2));
    notify("Fichier de sauvegarde exporté.");
  };

  const importFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isValidPayload(parsed)) throw new Error("format");
        setPendingRestoreFile(parsed);
      } catch {
        notify("Fichier de sauvegarde invalide.", "error");
      }
    };
    reader.readAsText(file);
  };

  const doRestoreFile = async () => {
    setBusy(true);
    try {
      /* Petite sécurité : on garde une copie avant d'écraser. */
      await saveBackupLocally("Sauvegarde avant restauration");
      const count = await restoreFromPayload(pendingRestoreFile as never);
      await reload();
      await refresh();
      notify(`${formatNumber(count)} enregistrement(s) restauré(s).`);
    } catch {
      notify("La restauration a échoué.", "error");
    } finally {
      setBusy(false);
      setPendingRestoreFile(null);
    }
  };

  const doRestoreLocal = async () => {
    if (!pendingRestore) return;
    setBusy(true);
    try {
      const count = await restoreFromPayload(JSON.parse(pendingRestore.data));
      await reload();
      notify(`${formatNumber(count)} enregistrement(s) restauré(s).`);
    } catch {
      notify("La restauration a échoué.", "error");
    } finally {
      setBusy(false);
      setPendingRestore(null);
    }
  };

  const exportStudentsCsv = () => {
    if (!db.students.length) return notify("Aucun élève à exporter.", "error");
    exportCsvFile(
      `eleves-${todayISO()}.csv`,
      ["Matricule", "Nom", "Prénom", "Sexe", "Naissance", "Classe", "Parent", "Téléphone", "Statut"],
      db.students.map((student) => [student.matricule, student.nom, student.prenom, student.sexe, student.dateNaissance, student.classe, student.parentNom, student.parentTelephone, student.statut])
    );
    notify("Élèves exportés en CSV.");
  };

  const wipeAll = async () => {
    setBusy(true);
    try {
      const { clearStore } = await import("../lib/db");
      for (const store of [STORES.students, STORES.attendance, STORES.lateness, STORES.permissions, STORES.illness, STORES.discipline, STORES.personnel]) {
        await clearStore(store);
      }
      await reload();
      notify("Toutes les données ont été effacées.", "info");
    } finally {
      setBusy(false);
      setPendingWipe(false);
    }
  };

  const last = backups[0];

  return (
    <div>
      <PageHeader title="💾 Sauvegarde" subtitle="Vos données restent sur l'appareil : pensez à exporter un fichier de sécurité" />

      {/* --------- État actuel --------- */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Card className="!p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Enregistrements</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatNumber(total)}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Sauvegardes</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{backups.length}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Dernière</p>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">{last ? formatDate(last.date.slice(0, 10)) : "—"}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Élèves</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{db.students.length}</p>
        </Card>
      </div>

      {/* --------- Actions --------- */}
      <Card className="mt-4" title="Actions">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button icon={<Save size={16} />} onClick={saveNow} disabled={busy}>
            💾 Sauvegarder
          </Button>
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportJson}>
            📤 Exporter les données (JSON)
          </Button>
          <Button variant="secondary" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>
            📥 Restaurer un fichier JSON
          </Button>
          <Button variant="secondary" icon={<FileJson size={16} />} onClick={exportStudentsCsv}>
            Exporter les élèves (CSV)
          </Button>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setPendingWipe(true)}>
            Effacer toutes les données
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => importFile(event.target.files?.[0])} />
        </div>

        <div className="mt-3">
          <Toggle
            checked={auto}
            label="Sauvegarde automatique quotidienne (au premier lancement du jour)"
            onChange={(value) => {
              setAuto(value);
              localStorage.setItem(AUTO_FLAG, value ? "1" : "0");
              notify(value ? "Sauvegarde automatique activée." : "Sauvegarde automatique désactivée.", "info");
            }}
          />
        </div>

        <div className="mt-3">
          <Callout tone="blue">
            Conseil : exportez le fichier JSON chaque semaine et conservez-le sur une clé USB ou dans le stockage du téléphone. En cas de perte ou de changement d'appareil, la restauration
            remet tout en place en quelques secondes.
          </Callout>
        </div>
      </Card>

      {/* --------- Liste des sauvegardes --------- */}
      <Card className="mt-4" title="Sauvegardes enregistrées sur l'appareil" subtitle="Les 10 plus récentes sont conservées">
        {backups.length === 0 ? (
          <EmptyState icon={<DatabaseBackup size={36} />} title="Aucune sauvegarde" message="Appuyez sur « 💾 Sauvegarder » pour créer la première copie de sécurité." />
        ) : (
          <Table head={["Date", "Libellé", "Contenu", "Taille", "Actions"]}>
            {backups.map((entry) => (
              <Tr key={entry.id}>
                <Td className="whitespace-nowrap text-[12px] font-semibold">{new Date(entry.date).toLocaleString("fr-FR")}</Td>
                <Td className="text-[12px]">{entry.label}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone="blue">{entry.counts.students} élèves</Badge>
                    <Badge tone="red">{entry.counts.attendance} abs.</Badge>
                    <Badge tone="amber">{entry.counts.lateness} ret.</Badge>
                    <Badge tone="violet">{entry.counts.discipline} disc.</Badge>
                  </div>
                </Td>
                <Td className="text-[12px]">{Math.round(entry.size / 1024)} Ko</Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => setPendingRestore(entry)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950" title="Restaurer cette sauvegarde">
                      <HardDriveDownload size={15} />
                    </button>
                    <button
                      onClick={() => {
                        downloadFile(`sauvegarde-${entry.date.slice(0, 10)}.json`, entry.data);
                        notify("Sauvegarde exportée.");
                      }}
                      className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      title="Exporter ce fichier"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      onClick={async () => {
                        await deleteLocalBackup(entry.id);
                        await deleteBackup(entry.id);
                        await refresh();
                        notify("Sauvegarde supprimée.", "info");
                      }}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* --------- Aperçu rapide des élèves --------- */}
      <Card className="mt-4" title="Données actuellement en mémoire" subtitle="Ces données sont celles utilisées par tous les écrans">
        {db.students.length === 0 ? (
          <EmptyState icon={<HardDriveDownload size={34} />} title="Base vide" message="Restaurez une sauvegarde ou ajoutez des élèves." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {db.students.slice(0, 12).map((student) => (
              <span key={student.id} className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-[12px] dark:border-slate-700">
                <Avatar photo={student.photo} text={initials(student)} size={26} />
                {fullName(student)}
              </span>
            ))}
            {db.students.length > 12 && <Badge>+ {db.students.length - 12}</Badge>}
          </div>
        )}
      </Card>

      {/* --------- Confirmations --------- */}
      <ConfirmDialog
        open={pendingRestore !== null}
        title="Restaurer cette sauvegarde ?"
        message="Les données actuelles seront remplacées par le contenu de la sauvegarde choisie. Une copie de sécurité sera d'abord créée automatiquement."
        confirmLabel="Restaurer"
        onCancel={() => setPendingRestore(null)}
        onConfirm={doRestoreLocal}
      />

      <ConfirmDialog
        open={pendingRestoreFile !== null}
        title="Restaurer depuis le fichier ?"
        message="Les données actuelles seront remplacées par celles du fichier importé. Une copie de sécurité sera créée avant l'opération."
        confirmLabel="Restaurer"
        onCancel={() => setPendingRestoreFile(null)}
        onConfirm={doRestoreFile}
      />

      <ConfirmDialog
        open={pendingWipe}
        title="Effacer toutes les données ?"
        message="Élèves, absences, retards, permissions, maladies et discipline seront définitivement supprimés de cet appareil. Exportez d'abord une sauvegarde !"
        confirmLabel="Tout effacer"
        onCancel={() => setPendingWipe(false)}
        onConfirm={wipeAll}
      />
    </div>
  );
}
