// Gupy: busca interna do portal de vagas (portal.gupy.io), usada por muitas empresas brasileiras.
// Não é uma API documentada; o endereço antigo (employability-portal / portal.api) saiu do ar em out/2026.

import { isoDate, norm, text, withinPeriod, errorMessage } from "../util.js";
import { matchesLocation } from "../locations.js";
import { blankExtras, workplaceFrom, contractFrom } from "../enrich.js";

const ENDPOINT = "https://portal.gupy.io/api/job-search/jobs";
const LIMIT = 100;

// Códigos de tipo de vaga da Gupy ("vacancy_type_effective"...).
const TYPES = {
  effective: "Efetivo", internship: "Estágio", temporary: "Temporário", trainee: "Trainee",
  apprentice: "Aprendiz", legal_entity: "PJ", freelancer: "Freelancer", autonomous: "Freelancer",
};
const WORKPLACE = { "on-site": "Presencial", onsite: "Presencial", hybrid: "Híbrido", remote: "Remoto" };

function contractOf(type) {
  const t = String(type ?? "").toLowerCase();
  for (const [code, label] of Object.entries(TYPES)) if (t.includes(code)) return label;
  if (/talent_pool|banco/.test(t)) return "";
  return contractFrom(t);
}

export function parseJobs(data, { loc, period }) {
  return (data?.data ?? [])
    .filter((j) => matchesLocation(loc, { city: j.city, state: j.state }) || (j.isRemoteWork && !loc.city))
    .map((j) => {
      const deadline = j.applicationDeadline ? isoDate(new Date(j.applicationDeadline)) : "";
      const badges = [];
      if (/talent_pool/i.test(j.type ?? "")) badges.push("Banco de talentos");
      return {
        ...blankExtras(),
        id: String(j.id),
        title: j.name ?? j.title ?? "",
        company: j.careerPageName ?? j.companyName ?? "",
        location: [j.city, j.state !== j.city && j.state].filter(Boolean).join(", ") || (j.isRemoteWork ? "Remoto" : ""),
        salary: "",
        date: isoDate(new Date(j.publishedDate ?? j.publishedAt)),
        posted: "",
        url: j.jobUrl ?? j.url ?? "",
        workplace: WORKPLACE[String(j.workplaceType ?? "").toLowerCase()] || (j.isRemoteWork ? "Remoto" : workplaceFrom(j.name)),
        contract: contractOf(j.type),
        pcd: Boolean(j.disabilities) || /pcd|pessoas? com deficiencia/.test(norm(j.name)),
        deadline,
        logo: j.careerPageLogo ?? "",
        // "disabilities" = a vaga também aceita pessoas com deficiência (não é exclusiva).
        // A página de carreiras da empresa é o próprio domínio da vaga (golcarreiras.gupy.io).
        companyUrl: j.careerPageUrl || (/^https:\/\/[^/]+\.gupy\.io/.exec(j.jobUrl ?? "")?.[0] ?? ""),
        badges,
        snippet: j.description ? text(j.description).slice(0, 280) : "",
      };
    })
    .filter((j) => withinPeriod(j.date, period) && (!j.deadline || j.deadline >= isoDate(new Date())));
}

// A busca da Gupy pode não achar "mecânico" quando o cargo está sem acento: tenta das duas formas.
export async function search(args) {
  const first = await searchOnce(args);
  const plain = norm(args.term);
  if (first.jobs.length || first.error || plain === args.term.toLowerCase()) return first;
  return searchOnce({ ...args, term: plain });
}

async function searchOnce({ term, loc, period, pages, debug }) {
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
      if (debug && page === 0) sample = JSON.stringify(data?.data?.[0] ?? data).slice(0, 1500);
      out.push(...parseJobs(data, { loc, period }));
      if ((data?.data?.length ?? 0) < LIMIT) break;
    }
    return { jobs: out, error: null, sample };
  } catch (e) {
    return { jobs: out, error: errorMessage(e, "Gupy") };
  }
}
