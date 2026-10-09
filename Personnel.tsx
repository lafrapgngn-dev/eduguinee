import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useApp } from "../store/AppStore";
import { buildReport } from "../lib/pdf";
import { exportCsvFile } from "../lib/backup";
import { todayISO, uid } from "../lib/format";
import type { PersonnelRecord } from "../lib/types";
import { Button, Card, ConfirmDialog, Field, PageHeader, Table, Td, Tr, inputClass } from "../components/ui";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function getCurrentDayName(date = new Date()): string {
  return DAYS[(date.getDay() + 6) % 7];
}

function getWeekBounds(date: Date) {
  const start = new Date(date);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function emptyForm(): Omit<PersonnelRecord, "id" | "createdAt"> {
  const today = new Date();
  return {
    nom: "",
    date: today.toISOString().slice(0, 10),
    jour: getCurrentDayName(today),
    fonction: "",
    heureArrivee: "",
    signature: "",
    heureDepart: "",
  };
}

function SignaturePad({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const paint = (point: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";

    if (!lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + 0.1, point.y + 0.1);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    lastPoint.current = point;
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(event);
    if (!point) return;
    drawing.current = true;
    lastPoint.current = null;
    paint(point);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const point = getPoint(event);
    if (!point) return;
    paint(point);
  };

  const endDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const width = 420;
    const height = 150;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";

    if (value && value.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = value;
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={continueDrawing} onPointerUp={endDrawing} onPointerLeave={endDrawing} className="w-full rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800" style={{ touchAction: "none", height: 150 }} />
      <div className="flex justify-end">
        <Button variant="ghost" onClick={clearCanvas}>
          Effacer la signature
        </Button>
      </div>
    </div>
  );
}

export default function Personnel() {
  const { db, settings, saveEvent, deleteEvent, notify } = useApp();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<PersonnelRecord, "id" | "createdAt">>(emptyForm());
  const [askDelete, setAskDelete] = useState<PersonnelRecord | null>(null);

  const today = todayISO();
  const todayEntries = useMemo(() => db.personnel.filter((row) => row.date === today), [db.personnel, today]);

  const weekRange = useMemo(() => getWeekBounds(new Date()), []);
  const weekEntries = useMemo(
    () => db.personnel.filter((row) => new Date(row.date) >= weekRange.start && new Date(row.date) <= weekRange.end),
    [db.personnel, weekRange.end, weekRange.start]
  );

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return [...db.personnel]
      .filter((row) => {
        if (!text) return true;
        const haystack = `${row.nom} ${row.fonction} ${row.date} ${row.jour}`.toLowerCase();
        return haystack.includes(text);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.personnel, query]);

  const setField = (key: keyof Omit<PersonnelRecord, "id" | "createdAt">, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const submit = async () => {
    const payload: PersonnelRecord = {
      id: editingId ?? uid("pers_"),
      nom: form.nom.trim(),
      date: form.date,
      jour: form.jour,
      fonction: form.fonction.trim(),
      heureArrivee: form.heureArrivee,
      signature: form.signature.trim(),
      heureDepart: form.heureDepart,
      createdAt: db.personnel.find((item) => item.id === editingId)?.createdAt ?? new Date().toISOString(),
    };

    if (!payload.nom || !payload.date || !payload.fonction || !payload.heureArrivee || !payload.heureDepart || !payload.signature) {
      notify("Veuillez remplir tous les champs requis du registre du personnel, y compris la signature.", "error");
      return;
    }

    await saveEvent("personnel", payload);
    resetForm();
  };

  const openEdit = (row: PersonnelRecord) => {
    setEditingId(row.id);
    setForm({
      nom: row.nom,
      date: row.date,
      jour: row.jour,
      fonction: row.fonction,
      heureArrivee: row.heureArrivee,
      signature: row.signature,
      heureDepart: row.heureDepart,
    });
  };

  const confirmDelete = async () => {
    if (!askDelete) return;
    await deleteEvent("personnel", askDelete.id);
    setAskDelete(null);
    if (editingId === askDelete.id) resetForm();
  };

  const exportPdf = () => {
    if (!db.personnel.length) {
      notify("Aucun enregistrement du personnel à exporter.", "error");
      return;
    }
    buildReport({ kind: "personnel", db, settings, periode: `Registre du personnel — ${today}`, dateDebut: "", dateFin: "" });
    notify("PDF du registre du personnel généré.");
  };

  const exportCsv = () => {
    if (!db.personnel.length) {
      notify("Aucun enregistrement du personnel à exporter en CSV.", "error");
      return;
    }

    exportCsvFile(
      `personnel-${today}.csv`,
      ["Nom", "Date", "Jour", "Fonction", "Heure d'arrivée", "Heure de départ", "Signature"],
      db.personnel.map((row) => [row.nom, row.date, row.jour, row.fonction, row.heureArrivee, row.heureDepart, row.signature ? "Oui" : "Non"])
    );
    notify("CSV du personnel exporté.");
  };

  return (
    <div>
      <PageHeader title="👥 Registre du personnel" subtitle="Suivi de présence, fonction, horaires et signature" actions={
        <>
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv}>CSV</Button>
          <Button icon={<FileDown size={16} />} onClick={exportPdf}>Exporter PDF</Button>
        </>
      } />

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
        <Card className="!p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Total</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{db.personnel.length}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Aujourd’hui</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{todayEntries.length}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Cette semaine</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{weekEntries.length}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Fonctions</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{new Set(db.personnel.map((row) => row.fonction).filter(Boolean)).size}</p>
        </Card>
      </div>

      <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Synthèse hebdomadaire</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
            <p className="text-[10px] uppercase text-slate-500">Entrées enregistrées</p>
            <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{weekEntries.length}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
            <p className="text-[10px] uppercase text-emerald-700 dark:text-emerald-300">Agents distincts</p>
            <p className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-300">{new Set(weekEntries.map((row) => row.nom).filter(Boolean)).size}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
            <p className="text-[10px] uppercase text-amber-700 dark:text-amber-300">Jours couverts</p>
            <p className="mt-1 text-xl font-black text-amber-700 dark:text-amber-300">{new Set(weekEntries.map((row) => row.date)).size}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <Card title={editingId ? "Modifier l’enregistrement" : "Nouvel enregistrement"} actions={<Button variant="secondary" onClick={resetForm}>Réinitialiser</Button>}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nom du personnel">
              <input className={inputClass} value={form.nom} onChange={(event) => setField("nom", event.target.value)} placeholder="Nom complet" />
            </Field>
            <Field label="Date">
              <input type="date" className={inputClass} value={form.date} onChange={(event) => setField("date", event.target.value)} />
            </Field>
            <Field label="Jour">
              <select className={inputClass} value={form.jour} onChange={(event) => setField("jour", event.target.value)}>
                <option value="">— Choisir —</option>
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fonction">
              <input className={inputClass} value={form.fonction} onChange={(event) => setField("fonction", event.target.value)} placeholder="Surveillant, agent, secrétaire..." />
            </Field>
            <Field label="Heure d’arrivée">
              <input type="time" className={inputClass} value={form.heureArrivee} onChange={(event) => setField("heureArrivee", event.target.value)} />
            </Field>
            <Field label="Heure de départ">
              <input type="time" className={inputClass} value={form.heureDepart} onChange={(event) => setField("heureDepart", event.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Signature du personnel">
                <SignaturePad value={form.signature} onChange={(value) => setField("signature", value)} />
              </Field>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button icon={<Plus size={16} />} onClick={submit}>
              {editingId ? "Enregistrer les modifications" : "Ajouter au registre"}
            </Button>
          </div>
        </Card>

        <Card title="Historique du registre">
          <div className="relative mb-3">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un nom, une fonction ou une date" />
          </div>

          <Table head={["Nom", "Date", "Fonction", "Arrivée", "Départ", "Signature", ""]}>
            {filtered.length === 0 ? (
              <Tr>
                <Td colSpan={7} className="py-6 text-center text-[12px] text-slate-500">
                  Aucune entrée pour le moment.
                </Td>
              </Tr>
            ) : (
              filtered.map((row) => (
                <Tr key={row.id}>
                  <Td className="text-[12px] font-semibold">{row.nom}</Td>
                  <Td className="text-[12px]">{row.date}</Td>
                  <Td className="text-[12px]">{row.fonction}</Td>
                  <Td className="text-[12px]">{row.heureArrivee}</Td>
                  <Td className="text-[12px]">{row.heureDepart}</Td>
                  <Td className="text-[12px]">
                    {row.signature.startsWith("data:image") ? <img src={row.signature} alt="Signature" className="h-10 max-w-[110px] rounded border border-slate-200 object-contain dark:border-slate-700" /> : row.signature || "—"}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" icon={<Pencil size={14} />} onClick={() => openEdit(row)}>
                        Modifier
                      </Button>
                      <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setAskDelete(row)}>
                        Supprimer
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Table>
        </Card>
      </div>

      <ConfirmDialog open={askDelete !== null} title="Supprimer cet enregistrement ?" message={`Cette entrée pour ${askDelete?.nom} sera supprimée définitivement.`} confirmLabel="Supprimer" onCancel={() => setAskDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
}
