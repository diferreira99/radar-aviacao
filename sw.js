// Deixa o site instalável e abre a última versão da página mesmo sem internet.
// As rotas /api nunca são guardadas: vagas e status sempre vêm da rede.
const CACHE = "radar-emprego-v3";

self.addEventListener("install", () => self.skipWaiting());
// Apaga as versões antigas guardadas para o site nunca abrir desatualizado.
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).pathname.startsWith("/api/")) return;
  if (req.mode !== "navigate" && new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
