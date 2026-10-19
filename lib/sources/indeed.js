// Indeed: API GraphQL do aplicativo do Indeed, a mesma usada pelo JobSpy (github.com/speedyapply/JobSpy).
// Pede os campos completos (salário, tipo de contrato, modelo de trabalho, logo); se a API recusar algum
// campo, refaz a busca só com o básico para nunca ficar sem vagas.

import { isoDate, text, errorMessage } from "../util.js";
import { blankExtras, workplaceFrom, contractFrom } from "../enrich.js";

const ENDPOINT = "https://apis.indeed.com/graphql";
const HEADERS = {
  Host: "apis.indeed.com",
  "content-type": "application/json",
  "indeed-api-key": "161092c2017b5bbab13edb12461a62d5a833871e7cad6d9d475304573de67ac8",
  accept: "application/json",
  "indeed-locale": "pt-BR",
  "accept-language": "pt-BR,pt;q=0.9",
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Indeed App 193.1",
  "indeed-app-info": "appv=193.1; appid=com.indeed.jobsearch; osv=16.6.1; os=ios; dtype=phone",
  "indeed-co": "BR",
};
const HOURS = { "24h": 24, week: 168, month: 720, any: 0 };
const LIMIT = 100;

const BASIC_FIELDS = `key
        title
        datePublished
        location { formatted { long } }
        employer { name }`;

const FULL_FIELDS = `key
        title
        datePublished
        location { city admin1Code formatted { long } }
        employer { name relativeCompanyPageUrl dossier { images { squareLogoUrl } } }
        attributes { key label }
        compensation {
          estimated { currencyCode baseSalary { unitOfWork range { ... on Range { min max } } } }
          baseSalary { unitOfWork range { ... on Range { min max } } }
          currencyCode
        }
        recruit { workSchedule }`;

function query({ term, where, period, cursor, full }) {
  const hours = HOURS[period];
  return `query GetJobData {
  jobSearch(
    what: ${JSON.stringify(term)}
    ${where ? `location: {where: ${JSON.stringify(where)}, radius: 30, radiusUnit: MILES}` : ""}
    limit: ${LIMIT}
    sort: DATE
    ${cursor ? `cursor: ${JSON.stringify(cursor)}` : ""}
    ${hours ? `filters: { date: { field: "dateOnIndeed", start: "${hours}h" } }` : ""}
  ) {
    pageInfo { nextCursor }
    results {
      job {
        ${full ? FULL_FIELDS : BASIC_FIELDS}
      }
    }
  }
}`;
}

const UNIT = { HOUR: "hora", DAY: "dia", WEEK: "semana", MONTH: "mês", YEAR: "ano" };
const brl = (n) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export function salaryOf(comp) {
  const base = comp?.baseSalary ?? comp?.estimated?.baseSalary;
  const range = base?.range;
  if (!range || (range.min == null && range.max == null)) return "";
  const unit = UNIT[base.unitOfWork] ? `/${UNIT[base.unitOfWork]}` : "";
  const estimated = !comp?.baseSalary && comp?.estimated ? " (estimado)" : "";
  const value = range.min && range.max && range.min !== range.max ? `${brl(range.min)} a ${brl(range.max)}` : brl(range.max ?? range.min);
  return value + unit + estimated;
}

export function parseJobs(data) {
  return (data?.data?.jobSearch?.results ?? []).map(({ job }) => {
    const labels = (job.attributes ?? []).map((a) => a.label).filter(Boolean);
    const all = [...labels, job.recruit?.workSchedule].filter(Boolean).join(" · ");
    const page = job.employer?.relativeCompanyPageUrl;
    return {
      ...blankExtras(),
      id: job.key,
      title: job.title ?? "",
      company: job.employer?.name ?? "",
      location: job.location?.formatted?.long ?? "",
      salary: salaryOf(job.compensation),
      date: job.datePublished ? isoDate(new Date(job.datePublished)) : "",
      posted: "",
      url: `https://br.indeed.com/viewjob?jk=${job.key}`,
      workplace: workplaceFrom(all, job.location?.formatted?.long, job.title),
      contract: contractFrom(all, job.title),
      pcd: /pcd|deficiencia/i.test(text(job.title ?? "")),
      logo: job.employer?.dossier?.images?.squareLogoUrl ?? "",
      companyUrl: page ? `https://br.indeed.com${page}` : "",
      badges: labels.slice(0, 4),
    };
  });
}

async function runQuery(body) {
  const res = await fetch(ENDPOINT, { method: "POST", headers: HEADERS, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw Object.assign(new Error(`Indeed respondeu ${res.status}`), { body: await res.text().catch(() => "") });
  return res.json();
}

export async function search({ term, loc, period, pages, debug }) {
  const out = [];
  let cursor = null;
  let sample;
  let full = true;
  try {
    for (let page = 0; page < Math.min(pages, 3); page++) {
      let data = await runQuery({ query: query({ term, where: loc.indeed, period, cursor, full }) });
      if (full && data.errors?.length && !data.data?.jobSearch) {
        // Algum campo extra foi recusado: segue só com o básico.
        if (debug) sample = `campos extras recusados: ${data.errors[0].message} · `;
        full = false;
        data = await runQuery({ query: query({ term, where: loc.indeed, period, cursor, full }) });
      }
      if (debug && page === 0) sample = (sample ?? "") + JSON.stringify(data?.data?.jobSearch?.results?.[0] ?? data).slice(0, 1500);
      if (data.errors?.length && !data.data?.jobSearch) {
        return { jobs: out, error: `Indeed: ${data.errors[0].message}`, sample };
      }
      out.push(...parseJobs(data));
      cursor = data.data?.jobSearch?.pageInfo?.nextCursor;
      if (!cursor) break;
    }
    return { jobs: out, error: null, sample };
  } catch (e) {
    return { jobs: out, error: errorMessage(e, "Indeed"), ...(debug && { sample: e.body?.slice(0, 400) }) };
  }
}
