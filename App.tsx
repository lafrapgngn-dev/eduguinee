/* =========================================================================
   App.tsx — LE CHEF D'ORCHESTRE
   -------------------------------------------------------------------------
   Son rôle est simple :
     1. afficher un écran de chargement pendant la lecture de la base,
     2. afficher la structure (Layout) avec le menu,
     3. afficher la bonne page selon la navigation,
     4. afficher la fiche d'un élève quand on la demande depuis n'importe
        quel écran (tableau de bord, recherche...).
   ========================================================================= */

import { useState } from "react";
import { AppProvider, useApp } from "./store/AppStore";
import { Layout } from "./components/Layout";
import { ToastStack, Spinner, Modal } from "./components/ui";
import { StudentSheet } from "./components/StudentSheet";
import type { PageId } from "./components/nav";

import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import Lateness from "./pages/Lateness";
import Permissions from "./pages/Permissions";
import Illness from "./pages/Illness";
import Discipline from "./pages/Discipline";
import Personnel from "./pages/Personnel";
import Search from "./pages/Search";
import Statistics from "./pages/Statistics";
import Reports from "./pages/Reports";
import Backup from "./pages/Backup";
import Settings from "./pages/Settings";

function Shell() {
  const { ready, toasts, dismissToast, db } = useApp();
  const [page, setPage] = useState<PageId>("dashboard");
  const [studentId, setStudentId] = useState<string | null>(null);

  /* --------- Écran d'attente (lecture d'IndexedDB) --------- */
  if (!ready) {
    return (
      <div className="premium-shell flex min-h-screen flex-col items-center justify-center gap-5">
        <div className="logo-orb flex h-20 w-20 items-center justify-center rounded-[28px] text-2xl font-black text-white">SM</div>
        <Spinner label="Ouverture de la base de données locale…" />
      </div>
    );
  }

  /* --------- Affichage de la page demandée --------- */
  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard onNavigate={setPage} onOpenStudent={setStudentId} />;
      case "students":
        return <Students />;
      case "attendance":
        return <Attendance />;
      case "lateness":
        return <Lateness />;
      case "permissions":
        return <Permissions />;
      case "illness":
        return <Illness />;
      case "discipline":
        return <Discipline />;
      case "personnel":
        return <Personnel />;
      case "search":
        return <Search onOpenStudent={setStudentId} />;
      case "statistics":
        return <Statistics />;
      case "reports":
        return <Reports />;
      case "backup":
        return <Backup />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard onNavigate={setPage} onOpenStudent={setStudentId} />;
    }
  };

  return (
    <>
      <Layout page={page} onNavigate={setPage}>
        {renderPage()}
      </Layout>

      {/* Fiche élève ouvrable depuis n'importe quel écran */}
      <Modal open={studentId !== null} title="Fiche de l'élève" onClose={() => setStudentId(null)} wide>
        {studentId && <StudentSheet studentId={studentId} onClose={() => setStudentId(null)} />}
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Le compteur évite un avertissement de dépendance inutile : la base
          est déjà réactive via le contexte. */}
      <span className="hidden">{db.students.length}</span>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
