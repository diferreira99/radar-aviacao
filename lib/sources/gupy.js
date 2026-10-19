// Gupy: busca interna do portal de vagas (portal.gupy.io), usada por muitas empresas brasileiras.
// Não é uma API documentada; o endereço antigo (employability-portal / portal.api) saiu do ar em out/2026.

import { isoDate, withinPeriod, errorMessage } from "../util.js";
import { matchesLocation } from "../locations.js";

const ENDPOINT = "https://portal.gupy.io/api/job-search/jobs";
const LIMIT = 100;

export function parseJobs(data, { loc, period }) {
  return (data?.data ?? [])
    .filter((j) => matchesLocation(loc, { city: j.city, state: j.state }) || (j.isRemoteWork && !loc.city))
    .map((j) => ({
      id: String(j.id),
      title: j.name ?? j.title ?? "",
      company: j.careerPageName ?? j.companyName ?? "",
      location: [j.city, j.state !== j.city && j.state].filter(Boolean).join(", ") || (j.isRemoteWork ? "Remoto" : ""),
      salary: "",
      date: isoDate(new Date(j.publishedDate ?? j.publishedAt)),
      posted: "",
      url: j.jobUrl ?? j.url ?? "",
    }))
    .filter((j) => withinPeriod(j.date, period));
}

export async function search({ term, loc, period, pages, debug }) {
  const out = [];
  let sample;
  try {
    for (let page = 0; page < pages; page++) {
      const params = new URLSearchParams({ jobName: term, limit: String(LIMIT), offset: String(page * LIMIT) });
      const res = await fetch(`${ENDPOINT}?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { jobs: out, error: `Gupy respondeu ${res.status}`, ...(debug && { sample: (await res.text()).slice(0, 400) }) };
      const data = await res.json();
      if (debug && page === 0) sample = JSON.stringify(data).slice(0, 800);
      out.push(...parseJobs(data, { loc, period }));
      if ((data?.data?.length ?? 0) < LIMIT) break;
    }
    return { jobs: out, error: null, sample };
  } catch (e) {
    return { jobs: out, error: errorMessage(e, "Gupy") };
  }
}
