import * as linkedin from "../lib/sources/linkedin.js";
import * as indeed from "../lib/sources/indeed.js";
import * as gupy from "../lib/sources/gupy.js";
import * as vagas from "../lib/sources/vagas.js";
import { LOCATIONS } from "../lib/locations.js";
import { getDetails } from "../lib/details.js";

const SOURCES = { linkedin, indeed, gupy, vagas };

// GET /api/saude?termo=manutenção: confere se cada fonte responde, se o filtro "Estado de SP"
// funciona em cada uma e se o resumo do anúncio abre. Serve para descobrir rápido o que quebrou.
export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const term = url.searchParams.get("termo") || "manutenção de aeronaves";
  const base = { term, period: "month", pages: 1 };

  const checks = await Promise.all(
    Object.entries(SOURCES).map(async ([name, source]) => {
      const started = Date.now();
      const [estado, br] = await Promise.all([
        source.search({ ...base, loc: LOCATIONS.estado }),
        source.search({ ...base, loc: LOCATIONS.br }),
      ]);
      const sample = estado.jobs[0] ?? br.jobs[0];
      let details = "sem vaga para testar";
      if (sample) {
        try {
          const d = await getDetails({ source: name, url: sample.url });
          details = `ok (${d.highlights.length} requisitos, ${d.licenses.length} licenças)`;
        } catch (e) {
          details = `erro: ${e.message}`;
        }
      }
      return {
        source: name,
        ok: !estado.error && !br.error && br.jobs.length > 0,
        estadoSP: estado.error ? `erro: ${estado.error}` : `${estado.jobs.length} vagas`,
        brasil: br.error ? `erro: ${br.error}` : `${br.jobs.length} vagas`,
        details,
        exemplo: sample ? `${sample.title} · ${sample.company} · ${sample.location}` : null,
        ms: Date.now() - started,
      };
    })
  );

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ checkedAt: new Date().toISOString(), term, checks });
}
