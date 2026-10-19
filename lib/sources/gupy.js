// Gupy: API pública do portal de vagas (portal.gupy.io), usada por muitas empresas brasileiras.

import { isoDate, withinPeriod, errorMessage } from "../util.js";
import { matchesLocation } from "../locations.js";

const ENDPOINT = "https://portal.api.gupy.io/api/v1/jobs";
const LIMIT = 100;

export function parseJobs(data, { loc, period }) {
  return (data?.data ?? [])
    .filter((j) => matchesLocation(loc, { city: j.city, state: j.state }) || (j.isRemoteWork && !loc.city))
    .map((j) => ({
      id: String(j.id),
      title: j.name ?? "",
      company: j.careerPageName ?? "",
      location: [j.city, j.state !== j.city && j.state].filter(Boolean).join(", ") || (j.isRemoteWork ? "Remoto" : ""),
      salary: "",
      date: isoDate(new Date(j.publishedDate)),
      posted: "",
      url: j.jobUrl ?? "",
    }))
    .filter((j) => withinPeriod(j.date, period));
}

export async function search({ term, loc, period, pages }) {
  const out = [];
  try {
    for (let page = 0; page < pages; page++) {
      const params = new URLSearchParams({ jobName: term, limit: String(LIMIT), offset: String(page * LIMIT) });
      const res = await fetch(`${ENDPOINT}?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { jobs: out, error: `Gupy respondeu ${res.status}` };
      const data = await res.json();
      out.push(...parseJobs(data, { loc, period }));
      if ((data?.data?.length ?? 0) < LIMIT) break;
    }
    return { jobs: out, error: null };
  } catch (e) {
    return { jobs: out, error: errorMessage(e, "Gupy") };
  }
}
