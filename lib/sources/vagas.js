// Vagas.com.br: página de busca em HTML, ordenada pelas mais recentes.

import { BROWSER_HEADERS, pick, text, norm, withinPeriod, errorMessage } from "../util.js";
import { matchesLocation } from "../locations.js";

const BASE = "https://www.vagas.com.br";

function slug(term) {
  return norm(term).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// "18/10/2026", "Hoje" ou "Ontem" → "2026-10-18"
function parseDate(s) {
  const n = norm(s);
  const d = new Date();
  if (n.includes("hoje")) return d.toISOString().slice(0, 10);
  if (n.includes("ontem")) return new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

export function parseJobs(html, { loc, period }) {
  const jobs = [];
  for (const card of html.split(/<li[^>]*class="[^"]*\bvaga\b/).slice(1)) {
    const link = card.match(/<a[^>]*link-detalhes-vaga[^>]*>/)?.[0] ?? "";
    const href = link.match(/href="([^"]+)"/)?.[1];
    if (!href) continue;
    const id = href.match(/\/vagas\/v?(\d+)/)?.[1] ?? href;
    const title = (link.match(/title="([^"]+)"/)?.[1] ?? "") || pick(card, /link-detalhes-vaga[^>]*>([\s\S]*?)<\/a>/);
    const location = pick(card, /<span[^>]*vaga-local[^>]*>([\s\S]*?)<\/span>/);
    const [city = "", state = ""] = location.split("/").map((s) => s.trim());
    const posted = pick(card, /<span[^>]*data-publicacao[^>]*>([\s\S]*?)<\/span>/);
    const date = parseDate(posted);
    if (!matchesLocation(loc, { city, state }) || !withinPeriod(date, period)) continue;
    jobs.push({
      id,
      title: text(title),
      company: pick(card, /<span[^>]*emprVaga[^>]*>([\s\S]*?)<\/span>/),
      location,
      salary: "",
      date,
      posted,
      url: href.startsWith("http") ? href : BASE + href,
    });
  }
  return jobs;
}

export async function search({ term, loc, period, pages, debug }) {
  const out = [];
  let sample;
  try {
    for (let page = 1; page <= pages; page++) {
      const params = new URLSearchParams({ ordenar_por: "mais_recentes" });
      if (page > 1) params.set("pagina", String(page));
      const res = await fetch(`${BASE}/vagas-de-${slug(term)}?${params}`, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(15000),
      });
      if (debug && page === 1) sample = `${res.status} ${res.url}`;
      if (res.status === 404) break;
      if (!res.ok) return { jobs: out, error: `Vagas.com.br respondeu ${res.status}`, sample };
      const html = await res.text();
      if (debug && page === 1) {
        const i = html.search(/class="[^"]*\bvaga\b/);
        sample += ` · ${html.length} bytes · ${(html.match(/link-detalhes-vaga/g) ?? []).length} cards · ` +
          (i >= 0 ? html.slice(i, i + 600) : html.replace(/\s+/g, " ").slice(0, 600));
      }
      out.push(...parseJobs(html, { loc, period }));
      if (!/link-detalhes-vaga/.test(html)) break;
    }
    return { jobs: out, error: null, sample };
  } catch (e) {
    return { jobs: out, error: errorMessage(e, "Vagas.com.br"), sample };
  }
}
