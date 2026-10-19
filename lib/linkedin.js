// Busca vagas na página pública (sem login) de vagas do LinkedIn e converte o HTML em objetos.

const ENDPOINT = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const PAGE_SIZE = 25;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml",
};

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function text(html) {
  return decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function pick(card, re) {
  const m = card.match(re);
  return m ? text(m[1]) : "";
}

export function parseJobs(html) {
  const jobs = [];
  for (const card of html.split(/<li[\s>]/).slice(1)) {
    const id = card.match(/jobPosting:(\d+)/)?.[1];
    if (!id) continue;
    const anchor = card.match(/<a[^>]*base-card__full-link[^>]*>/)?.[0] ?? "";
    const href = decode(anchor.match(/href="([^"]+)"/)?.[1] ?? "");
    jobs.push({
      id,
      title: pick(card, /<h3[^>]*base-search-card__title[^>]*>([\s\S]*?)<\/h3>/),
      company: pick(card, /<h4[^>]*base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/),
      location: pick(card, /<span[^>]*job-search-card__location[^>]*>([\s\S]*?)<\/span>/),
      salary: pick(card, /<span[^>]*job-search-card__salary-info[^>]*>([\s\S]*?)<\/span>/),
      date: card.match(/<time[^>]*datetime="([^"]+)"/)?.[1] ?? "",
      posted: pick(card, /<time[^>]*>([\s\S]*?)<\/time>/),
      url: href ? href.split("?")[0] : `https://www.linkedin.com/jobs/view/${id}/`,
    });
  }
  return jobs;
}

export async function searchTerm({ term, location, tpr, pages }) {
  const out = [];
  let error = null;
  for (let page = 0; page < pages; page++) {
    const params = new URLSearchParams({ keywords: term, location, start: String(page * PAGE_SIZE) });
    if (tpr) params.set("f_TPR", tpr);
    try {
      const res = await fetch(`${ENDPOINT}?${params}`, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        error = `LinkedIn respondeu ${res.status}`;
        break;
      }
      const jobs = parseJobs(await res.text());
      out.push(...jobs);
      if (jobs.length < PAGE_SIZE) break;
    } catch (e) {
      error = e.name === "TimeoutError" ? "LinkedIn demorou para responder" : e.message;
      break;
    }
  }
  return { term, jobs: out, error };
}
