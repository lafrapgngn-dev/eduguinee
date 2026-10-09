/* =========================================================================
   Settings.tsx — PARAMÈTRES
   -------------------------------------------------------------------------
   - Identité de l'établissement (reprise dans les rapports PDF)
   - Logo (facultatif)
   - Mode sombre
   - Code PIN (empreinte, jamais stocké en clair)
   - Informations sur le mode hors connexion
   ========================================================================= */

import { useEffect, useState } from "react";
import { Moon, Save, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { useApp } from "../store/AppStore";
import { Button, Callout, Card, ConfirmDialog, Field, PageHeader, Table, Td, Toggle, Tr, inputClass } from "../components/ui";
import { clean } from "../lib/validate";
import { STORES, clearStore } from "../lib/db";

/** Empreinte cryptographique du PIN : on ne garde jamais le code en clair. */
async function fingerprint(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin);

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const value = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `pin_${value}`;
  }

  let hash = 2166136261;
  for (let index = 0; index < pin.length; index++) {
    hash ^= pin.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `pin_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export default function Settings() {
  const { settings, saveSettings, notify, online, db, reload } = useApp();
  const [form, setForm] = useState(settings);
  const [pin, setPin] = useState("");
  const [askWipe, setAskWipe] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async () => {
    const patch: Partial<typeof form> = {
      schoolName: clean(form.schoolName, 80),
      schoolMotto: clean(form.schoolMotto, 80),
      schoolYear: clean(form.schoolYear, 20),
      surveillant: clean(form.surveillant, 60),
      darkMode: form.darkMode,
    };
    if (pin) {
      if (!/^\d{4,6}$/.test(pin)) {
        notify("Le code PIN doit contenir 4 à 6 chiffres.", "error");
        return;
      }
      (patch as Record<string, unknown>).pin = await fingerprint(pin);
    }
    await saveSettings(patch);
    setPin("");
  };

  const pickLogo = (file?: File) => {
    if (!file) return;
    if (file.size > 400 * 1024) return notify("Logo trop lourd (max 400 Ko).", "error");
    const reader = new FileReader();
    reader.onload = () => set({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const wipeEverything = async () => {
    for (const store of [STORES.students, STORES.attendance, STORES.lateness, STORES.permissions, STORES.illness, STORES.discipline, STORES.personnel]) {
      await clearStore(store);
    }
    await reload();
    setAskWipe(false);
    notify("Données effacées.", "info");
  };

  return (
    <div>
      <PageHeader title="⚙️ Paramètres" subtitle="Ces informations apparaissent en tête de tous vos rapports PDF" />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Établissement" actions={<Button icon={<Save size={16} />} onClick={submit}>Enregistrer</Button>}>
          <div className="space-y-3">
            <Field label="Nom de l'établissement">
              <input className={inputClass} value={form.schoolName} onChange={(event) => set({ schoolName: event.target.value })} />
            </Field>
            <Field label="Devise / sous-titre">
              <input className={inputClass} value={form.schoolMotto} onChange={(event) => set({ schoolMotto: event.target.value })} />
            </Field>
            <Field label="Année scolaire">
              <input className={inputClass} value={form.schoolYear} onChange={(event) => set({ schoolYear: event.target.value })} placeholder="2025-2026" />
            </Field>
            <Field label="Surveillant / conseiller éducatif">
              <input className={inputClass} value={form.surveillant} onChange={(event) => set({ surveillant: event.target.value })} />
            </Field>
            <Field label="Logo (facultatif)" hint="Utilisé en haut des rapports PDF">
              <div className="flex items-center gap-3">
                {form.logo ? <img src={form.logo} alt="Logo" className="h-12 w-12 rounded-lg object-contain" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-400 dark:bg-slate-800">LOGO</span>}
                <input type="file" accept="image/*" className="text-xs" onChange={(event) => pickLogo(event.target.files?.[0])} />
                {form.logo && (
                  <Button variant="ghost" onClick={() => set({ logo: undefined })}>
                    Retirer
                  </Button>
                )}
              </div>
            </Field>
          </div>
        </Card>

        <div className="space-y-3">
          <Card title="Apparence & sécurité">
            <div className="space-y-3">
              <Toggle checked={form.darkMode} label="Mode sombre" onChange={(value) => set({ darkMode: value })} />
              <Field label="Nouveau code PIN (4 à 6 chiffres)" hint="Protégera l'application à l'ouverture (fonctionnalité à activer plus tard).">
                <input type="password" inputMode="numeric" className={inputClass} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••" />
              </Field>
              <Button variant="secondary" icon={<ShieldCheck size={16} />} onClick={submit}>
                Enregistrer le PIN
              </Button>
              {settings.pin && <p className="text-[11px] text-emerald-600">✔ Un code PIN est déjà défini (stocké sous forme d'empreinte, jamais en clair).</p>}
            </div>
          </Card>

          <Card title="Mode hors connexion">
            <p className={`mb-2 flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${online ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"}`}>
              {online ? "🔵 Connexion disponible" : "🟢 Application hors ligne prête"}
            </p>
            <Table head={["Élément", "État"]}>
              <Tr>
                <Td className="text-[12px]">Base de données locale (IndexedDB)</Td>
                <Td className="text-[12px] font-bold text-emerald-600">Active</Td>
              </Tr>
              <Tr>
                <Td className="text-[12px]">Service worker (cache hors ligne)</Td>
                <Td className="text-[12px] font-bold text-emerald-600">{"serviceWorker" in navigator ? "Disponible" : "Non pris en charge"}</Td>
              </Tr>
              <Tr>
                <Td className="text-[12px]">Enregistrements en mémoire</Td>
                <Td className="text-[12px] font-bold">{db.students.length + db.attendance.length + db.lateness.length + db.permissions.length + db.illness.length + db.discipline.length}</Td>
              </Tr>
            </Table>
            <div className="mt-3">
              <Callout tone="green">
                Toutes les données sont stockées sur l'appareil. Aucune information n'est envoyée sur Internet : l'application fonctionne entièrement hors connexion.
              </Callout>
            </div>
          </Card>

          <Card title="Zone sensible">
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setAskWipe(true)}>
              Effacer toutes les données locales
            </Button>
            <p className="mt-2 text-[11px] text-slate-500">Exportez d'abord une sauvegarde depuis l'écran « 💾 Sauvegarde ».</p>
          </Card>
        </div>
      </div>

      <Card className="mt-3" title="Installer l'application sur Android" actions={<Smartphone size={16} className="text-slate-400" />}>
        <ol className="ml-4 list-decimal space-y-1 text-[12px] text-slate-600 dark:text-slate-300">
          <li>Ouvrez l'application dans Chrome (adresse locale ou hébergée).</li>
          <li>Menu Chrome (⋮) → <strong>Ajouter à l'écran d'accueil</strong>.</li>
          <li>L'icône apparaît comme une vraie application, en plein écran.</li>
          <li>Coupez le Wi-Fi et les données mobiles : tout continue de fonctionner.</li>
        </ol>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
          <Moon size={12} /> Astuce : le mode sombre réduit la fatigue visuelle lors des gardes de soirée.
        </p>
      </Card>

      <ConfirmDialog open={askWipe} title="Effacer toutes les données ?" message="Cette action est irréversible. Exportez une sauvegarde avant de continuer." confirmLabel="Effacer" onCancel={() => setAskWipe(false)} onConfirm={wipeEverything} />
    </div>
  );
}
