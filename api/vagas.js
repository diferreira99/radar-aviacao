import * as linkedin from "../lib/sources/linkedin.js";
import * as indeed from "../lib/sources/indeed.js";
import * as gupy from "../lib/sources/gupy.js";
import * as vagas from "../lib/sources/vagas.js";
import { LOCATIONS } from "../lib/locations.js";
import { norm } from "../lib/util.js";

const SOURCES = { linkedin, indeed, gupy, vagas };
const MAX_TERMS = 15;
const CONCURRENCY = 6;

// GET /api/vagas?sources=linkedin,indeed,gupy,vagas&terms=a|b|c&loc=sp&period=week&pages=3
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
  const sources = (url.searchParams.get("sources") ?? "linkedin").split(",").filter((s) => SOURCES[s]);
  if (!sources.length) {
    res.status(400).json({ error: `Fontes válidas: ${Object.keys(SOURCES).join(", ")}` });
    return;
  }
  const locKey = LOCATIONS[url.searchParams.get("loc")] ? url.searchParams.get("loc") : "sp";
  const loc = LOCATIONS[locKey];
  const period = url.searchParams.get("period") ?? "week";
  const pages = Math.min(Math.max(Number(url.searchParams.get("pages")) || 3, 1), 6);

  const tasks = sources.flatMap((source) => terms.map((term) => ({ source, term })));
  const results = [];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (tasks.length) {
        const { source, term } = tasks.shift();
        const r = await SOURCES[source].search({ term, loc, period, pages });
        results.push({ source, term, ...r });
      }
    })
  );

  // A mesma vaga pode aparecer em vários termos e em várias fontes: junta pelo cargo + empresa
  // e guarda os termos que a encontraram e o link de cada fonte.
  const merged = new Map();
  for (const r of results) {
    for (const job of r.jobs) {
      const key = `${norm(job.title)}|${norm(job.company)}`;
      const seen = merged.get(key);
      if (!seen) {
        merged.set(key, { ...job, terms: [r.term], links: { [r.source]: job.url } });
        continue;
      }
      if (!seen.terms.includes(r.term)) seen.terms.push(r.term);
      seen.links[r.source] ??= job.url;
      if (job.date > seen.date) seen.date = job.date;
      seen.salary ||= job.salary;
    }
  }
  const jobs = [...merged.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
  res.status(200).json({
    fetchedAt: new Date().toISOString(),
    loc: locKey,
    jobs,
    runs: results.map((r) => ({ source: r.source, term: r.term, count: r.jobs.length, error: r.error })),
  });
}
