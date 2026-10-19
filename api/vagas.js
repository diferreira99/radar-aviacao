import * as linkedin from "../lib/sources/linkedin.js";
import * as indeed from "../lib/sources/indeed.js";
import * as gupy from "../lib/sources/gupy.js";
import * as vagas from "../lib/sources/vagas.js";
import { LOCATIONS } from "../lib/locations.js";
import { norm } from "../lib/util.js";
import { isRelevant, score } from "../lib/relevance.js";
import { NICHES, DEFAULT_NICHE } from "../lib/niches.js";

const SOURCES = { linkedin, indeed, gupy, vagas };
const MAX_TERMS = 15;
const CONCURRENCY = 6;

// Termos colados já codificados ("mecânico%20de%20aeronaves") chegam com o %20 literal.
function decodeTerm(t) {
  try {
    return /%[0-9a-f]{2}/i.test(t) ? decodeURIComponent(t) : t;
  } catch {
    return t;
  }
}

// GET /api/vagas?sources=linkedin,indeed,gupy,vagas&terms=a|b|c&loc=sp&period=week&pages=3&niche=aviacao[&debug=1]
export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const terms = (url.searchParams.get("terms") ?? "")
    .split("|")
    .map((t) => decodeTerm(t).trim())
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
  const debug = url.searchParams.get("debug") === "1";
  const niche = NICHES[url.searchParams.get("niche")] ? url.searchParams.get("niche") : DEFAULT_NICHE;

  const tasks = sources.flatMap((source) => terms.map((term) => ({ source, term })));
  const results = [];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (tasks.length) {
        const { source, term } = tasks.shift();
        const r = await SOURCES[source].search({ term, loc, period, pages, debug });
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
        const relevant = isRelevant(job, niche);
        // "aviation" fica como sinônimo de "relevant" para quem já usa a API (alerta do n8n).
        merged.set(key, { ...job, badges: [...(job.badges ?? [])], relevant, aviation: relevant, score: score(job, niche), terms: [r.term], links: { [r.source]: job.url } });
        continue;
      }
      if (!seen.terms.includes(r.term)) seen.terms.push(r.term);
      seen.links[r.source] ??= job.url;
      if (job.date > seen.date) seen.date = job.date;
      // Cada fonte sabe coisas diferentes da mesma vaga: completa o que faltar.
      for (const f of ["salary", "workplace", "contract", "level", "deadline", "logo", "companyUrl", "snippet"]) seen[f] ||= job[f];
      seen.pcd ||= job.pcd;
      for (const b of job.badges ?? []) if (!seen.badges.includes(b)) seen.badges.push(b);
    }
  }
  const jobs = [...merged.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  res.setHeader("Cache-Control", debug ? "no-store" : "s-maxage=600, stale-while-revalidate=1800");
  res.status(200).json({
    fetchedAt: new Date().toISOString(),
    loc: locKey,
    niche,
    jobs,
    runs: results.map((r) => ({
      source: r.source,
      term: r.term,
      count: r.jobs.length,
      error: r.error,
      ...(debug && { sample: r.sample }),
    })),
  });
}
