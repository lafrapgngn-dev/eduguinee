/* =========================================================================
   main.tsx — POINT D'ENTRÉE
   -------------------------------------------------------------------------
   1. Monte l'application React dans la <div id="root"> de index.html.
   2. Enregistre le Service Worker (public/sw.js) : c'est LUI qui rend
      l'application utilisable sans Internet.
   ========================================================================= */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/* -------------------- Service Worker (mode hors ligne) -------------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.info("✅ Service worker actif — application disponible hors connexion."))
      .catch((error) => console.warn("Service worker non enregistré :", error));
  });
}
