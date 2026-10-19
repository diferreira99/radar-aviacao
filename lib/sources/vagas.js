// Vagas.com.br: página de busca em HTML, ordenada pelas mais recentes.

import { BROWSER_HEADERS, pick, text, norm, withinPeriod, errorMessage } from "../util.js";
import { matchesLocation } from "../locations.js";
import { blankExtras, workplaceFrom, contractFrom, levelFrom } from "../enrich.js";

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

// "São Paulo / SP" dentro do bloco vaga-local (que pode ter ícones e spans aninhados),
// ou no próprio cargo ("Técnico ... - Sorocaba/SP").
const CITY_UF = /([A-Za-zÀ-ÿ'][A-Za-zÀ-ÿ' .-]*?)\s*\/\s*([A-Z]{2})\b/;

function parseLocation(src) {
  const i = src.indexOf("vaga-local");
  const chunk = i >= 0 ? text(src.slice(src.indexOf(">", i) + 1, i + 500)) : text(src);
  const m = chunk.match(CITY_UF);
  // No cargo, a cidade vem depois do último " - ".
  return m ? { city: m[1].split(/\s[-–]\s/).pop().trim(), state: m[2] } : null;
}

export function parseJobs(html, { loc, period }) {
  const jobs = [];
  for (const card of html.split(/<li[^>]*class="[^"]*\bvaga\b/).slice(1)) {
    const link = card.match(/<a[^>]*link-detalhes-vaga[^>]*>/)?.[0] ?? "";
    const href = link.match(/href="([^"]+)"/)?.[1];
    if (!href) continue;
    const id = href.match(/\/vagas\/v?(\d+)/)?.[1] ?? href;
    const title = (link.match(/title="([^"]+)"/)?.[1] ?? "") || pick(card, /link-detalhes-vaga[^>]*>([\s\S]*?)<\/a>/);
    const { city, state } = parseLocation(card) ?? parseLocation(title) ?? { city: "", state: "" };
    const location = city ? `${city} / ${state}` : "";
    const posted = pick(card, /<span[^>]*data-publicacao[^>]*>([\s\S]*?)<\/span>/);
    const date = parseDate(posted);
    if (!matchesLocation(loc, { city, state }) || !withinPeriod(date, period)) continue;
    // O card traz o nível que a empresa informou ("Pleno", "Júnior/Trainee"...) e um trecho da descrição.
    const levelText = pick(card, /<span[^>]*nivelVaga[^>]*>([\s\S]*?)<\/span>/);
    const snippet = pick(card, /<div[^>]*class="[^"]*detalhes[^"]*"[^>]*>([\s\S]*?)<\/div>/).slice(0, 280);
    const logo = card.match(/logoEmpresa[\s\S]*?<img[^>]*src="([^"]+)"/)?.[1] ?? "";
    const plainTitle = text(title);
    jobs.push({
      ...blankExtras(),
      id,
      title: plainTitle,
      level: levelFrom(levelText),
      workplace: workplaceFrom(plainTitle, location, snippet),
      contract: contractFrom(plainTitle, levelText),
      pcd: /pcd|deficiencia/.test(norm(plainTitle + " " + snippet)),
      logo: logo.startsWith("//") ? "https:" + logo : logo,
      badges: levelText ? [levelText] : [],
      snippet,
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
