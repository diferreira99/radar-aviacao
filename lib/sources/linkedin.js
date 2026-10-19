// LinkedIn: página pública (sem login) de vagas, que devolve os cards em HTML.

import { BROWSER_HEADERS, decode, pick, text, errorMessage } from "../util.js";
import { blankExtras, workplaceFrom, contractFrom } from "../enrich.js";

const ENDPOINT = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const TPR = { "24h": "r86400", week: "r604800", month: "r2592000", any: "" };

export function parseJobs(html) {
  const jobs = [];
  for (const card of html.split(/<li[\s>]/).slice(1)) {
    const id = card.match(/jobPosting:(\d+)/)?.[1];
    if (!id) continue;
    const anchor = card.match(/<a[^>]*base-card__full-link[^>]*>/)?.[0] ?? "";
    const href = decode(anchor.match(/href="([^"]+)"/)?.[1] ?? "");
    const title = pick(card, /<h3[^>]*base-search-card__title[^>]*>([\s\S]*?)<\/h3>/);
    const location = pick(card, /<span[^>]*job-search-card__location[^>]*>([\s\S]*?)<\/span>/);
    // Selos do card: "Candidatura simplificada", "Seja um dos 25 primeiros candidatos"...
    const badges = [...card.matchAll(/job-posting-benefits__text[^>]*>([\s\S]*?)<\/span>/g)]
      .map((m) => text(m[1])).filter(Boolean);
    const logo = decode(card.match(/<img[^>]*data-delayed-url="([^"]+)"/)?.[1] ?? "");
    const companyUrl = decode(card.match(/<h4[^>]*base-search-card__subtitle[\s\S]*?<a[^>]*href="([^"]+)"/)?.[1] ?? "").split("?")[0];
    jobs.push({
      ...blankExtras(),
      id,
      title,
      company: pick(card, /<h4[^>]*base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/),
      location,
      salary: pick(card, /<span[^>]*job-search-card__salary-info[^>]*>([\s\S]*?)<\/span>/),
      date: card.match(/<time[^>]*datetime="([^"]+)"/)?.[1] ?? "",
      posted: pick(card, /<time[^>]*>([\s\S]*?)<\/time>/),
      url: href ? href.split("?")[0] : `https://www.linkedin.com/jobs/view/${id}/`,
      workplace: workplaceFrom(location, title),
      contract: contractFrom(title),
      pcd: /pcd|deficiencia/i.test(title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")),
      logo,
      companyUrl,
      badges,
    });
  }
  return jobs;
}

export async function search({ term, loc, period, pages }) {
  const out = [];
  let error = null;
  // O LinkedIn devolve cerca de 10 vagas por página; avança pelo número realmente recebido.
  for (let page = 0; page < pages; page++) {
    const params = new URLSearchParams({ keywords: term, location: loc.linkedin, start: String(out.length) });
    if (TPR[period]) params.set("f_TPR", TPR[period]);
    try {
      const res = await fetch(`${ENDPOINT}?${params}`, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        error = `LinkedIn respondeu ${res.status}`;
        break;
      }
      const jobs = parseJobs(await res.text());
      if (!jobs.length) break;
      out.push(...jobs);
    } catch (e) {
      error = errorMessage(e, "LinkedIn");
      break;
    }
  }
  return { jobs: out, error };
}
