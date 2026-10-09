/* =========================================================================
   SERVICE WORKER — le "gardien" du mode hors connexion
   -------------------------------------------------------------------------
   Un Service Worker est un petit script que le navigateur garde en mémoire
   même quand l'application est fermée. Il se place ENTRE l'application et
   le réseau. À chaque demande de fichier, il décide :
     - soit de répondre avec la copie gardée dans le CACHE (rapide, hors ligne)
     - soit d'aller chercher sur le réseau.
   Résultat : l'application démarre et fonctionne sans Internet.
   ========================================================================= */

const CACHE_NAME = "surveillant-manager-v1";

/* Fichiers indispensables au démarrage de l'application (le "coquillage"). */
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-512.png"];

/* 1) INSTALLATION : on met en cache l'ossature de l'application. */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* 2) ACTIVATION : on supprime les anciens caches (versions précédentes). */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

/* 3) INTERCEPTION DES REQUÊTES : stratégie "cache d'abord, réseau ensuite".
      Les données restent dans IndexedDB (côté application), donc elles sont
      toujours disponibles, même sans aucune connexion. */
function isCacheableRequest(request) {
  try {
    const url = new URL(request.url);
    return request.method === "GET" && url.origin === self.location.origin && ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!isCacheableRequest(request)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (!response || !response.ok || response.type !== "basic") return response;

          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          /* Réseau indisponible : on renvoie la page de l'application. */
          caches.match("/index.html").then((page) => page || Response.error())
        );
    })
  );
});
