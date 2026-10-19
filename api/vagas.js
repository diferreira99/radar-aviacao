import { searchTerm } from "../lib/linkedin.js";

const TPR = { "24h": "r86400", week: "r604800", month: "r2592000", any: "" };
const MAX_TERMS = 15;
const CONCURRENCY = 3;

// GET /api/vagas?terms=a|b|c&location=São Paulo, Brasil&period=week&pages=3
export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const terms = (url.searchParams.get("terms") ?? "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_TERMS);
  if (!terms.length) {
    res.status(400).json({ error: "Informe ao menos um termo em ?terms=" });
    return;
  }
  const location = url.searchParams.get("location") || "São Paulo, Brasil";
  const tpr = TPR[url.searchParams.get("period")] ?? TPR.week;
  const pages = Math.min(Math.max(Number(url.searchParams.get("pages")) || 3, 1), 6);

  const results = [];
  const queue = [...terms];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const term = queue.shift();
        results.push(await searchTerm({ term, location, tpr, pages }));
      }
    })
  );

  // Junta as vagas repetidas entre termos, guardando quais termos encontraram cada uma.
  const byId = new Map();
  for (const r of results) {
    for (const job of r.jobs) {
      const seen = byId.get(job.id);
      if (seen) {
        if (!seen.terms.includes(r.term)) seen.terms.push(r.term);
      } else {
        byId.set(job.id, { ...job, terms: [r.term] });
      }
    }
  }
  const jobs = [...byId.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
  res.status(200).json({
    fetchedAt: new Date().toISOString(),
    location,
    jobs,
    terms: results.map((r) => ({ term: r.term, count: r.jobs.length, error: r.error })),
  });
}
