// Abre o anúncio de uma vaga e resume o que importa: licenças ANAC, inglês, experiência, salário e requisitos.

import { BROWSER_HEADERS, text, norm, errorMessage } from "./util.js";
import { workplaceFrom, contractFrom, levelFrom } from "./enrich.js";

const INDEED_HEADERS = {
  "content-type": "application/json",
  "indeed-api-key": "161092c2017b5bbab13edb12461a62d5a833871e7cad6d9d475304573de67ac8",
  accept: "application/json",
  "indeed-locale": "pt-BR",
  "indeed-co": "BR",
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Indeed App 193.1",
  "indeed-app-info": "appv=193.1; appid=com.indeed.jobsearch; osv=16.6.1; os=ios; dtype=phone",
};

async function getHtml(url) {
  const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`o site respondeu ${res.status}`);
  return res.text();
}

function clean(html) {
  return html
    .replace(/<(script|style|noscript|svg|header|footer|nav)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, "\n");
}

function lines(html) {
  return clean(html)
    .split("\n")
    .map((l) => text(l))
    .filter(Boolean);
}

// Cada fonte devolve a lista de linhas do texto do anúncio.
const FETCHERS = {
  async linkedin(job) {
    const id = job.id ?? job.url.match(/(\d{6,})\/?$/)?.[1];
    const html = await getHtml(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`);
    const body = html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? html;
    // Critérios estruturados do anúncio: nível, tipo de emprego, função e setores.
    const criteria = {};
    for (const m of html.matchAll(/description__job-criteria-subheader[^>]*>([\s\S]*?)<\/h3>[\s\S]*?description__job-criteria-text[^>]*>([\s\S]*?)<\/span>/g)) {
      criteria[norm(text(m[1]))] = text(m[2]);
    }
    const find = (re) => Object.entries(criteria).find(([k]) => re.test(k))?.[1] ?? "";
    const applicants = text(html.match(/num-applicants__caption[^>]*>([\s\S]*?)<\/(?:span|figcaption)>/)?.[1] ?? "");
    return {
      lines: lines(body),
      extra: {
        applicants,
        seniority: find(/nivel|seniority/),
        employmentType: find(/tipo de emprego|employment/),
        jobFunction: find(/funcao|function/),
        industries: find(/setor|industr/),
      },
    };
  },

  async indeed(job) {
    const key = job.id ?? new URL(job.url).searchParams.get("jk");
    const res = await fetch("https://apis.indeed.com/graphql", {
      method: "POST",
      headers: INDEED_HEADERS,
      body: JSON.stringify({
        query: `query { jobData(jobKeys: [${JSON.stringify(key)}]) { results { job { description { html } } } } }`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`o Indeed respondeu ${res.status}`);
    const data = await res.json();
    const html = data?.data?.jobData?.results?.[0]?.job?.description?.html;
    if (!html) throw new Error(data?.errors?.[0]?.message ?? "o Indeed não devolveu a descrição");
    return lines(html);
  },

  async gupy(job) {
    const html = await getHtml(job.url);
    // As páginas da Gupy trazem o anúncio no JSON do Next.js.
    const next = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    if (next) {
      const parts = [];
      const walk = (v, k = "") => {
        if (typeof v === "string" && /description|responsibilit|prerequisit|requirement|relevantExperience|benefit/i.test(k)) {
          parts.push(v);
        } else if (v && typeof v === "object") {
          for (const [kk, vv] of Object.entries(v)) walk(vv, kk);
        }
      };
      walk(JSON.parse(next));
      if (parts.length) return lines(parts.join("\n"));
    }
    return lines(html);
  },

  async vagas(job) {
    const html = await getHtml(job.url);
    const i = html.search(/job-description|descricao-vaga|texto-descricao/);
    return lines(i >= 0 ? html.slice(html.indexOf(">", i) + 1, i + 20000) : html);
  },
};

const ALLOWED_HOSTS = {
  linkedin: /(^|\.)linkedin\.com$/,
  indeed: /(^|\.)indeed\.com$/,
  gupy: /(^|\.)gupy\.io$/,
  vagas: /(^|\.)vagas\.com\.br$/,
};

const LICENSES = [
  ["CHT", /\bcht\b/], ["CMA", /\bcma\b/], ["CCF", /\bccf\b/], ["ANAC", /\banac\b/],
  ["B1", /\bb1\b/], ["B2", /\bb2\b/], ["Célula", /\bcelula\b/], ["GMP", /\bgmp\b|grupo moto ?propulsor/],
  ["Aviônicos", /\bavionic/], ["RBAC 145", /rbac[ -]?145|part[ -]?145/], ["EASA", /\beasa\b/], ["FAA", /\bfaa\b/],
];
const REGIMES = [["CLT", /\bclt\b/], ["PJ", /\bpj\b/], ["Estágio", /\bestagi/], ["Temporário", /temporari/], ["Turnos", /\bturno|\bescala\b/]];
const REQUIREMENT_RE = /requisit|experiencia|conhecimento|formacao|curso|desejavel|obrigatori|licenca|habilita|ingles|graduac|tecnico em/;

export function summarize(all) {
  const full = all.join("\n");
  const n = norm(full);
  const found = (list) => list.filter(([, re]) => re.test(n)).map(([label]) => label);
  const english = full.match(/ingl[eê]s(?:\s+(?:n[ií]vel\s+)?(avan[çc]ado|intermedi[aá]rio|fluente|b[aá]sico|t[eé]cnico))?/i);
  const years = n.match(/(\d{1,2})\s*(?:\+\s*)?anos? de experiencia/);
  const salary = full.match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?(?:\s*(?:a|até|-)\s*R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?)?/);
  const highlights = all
    .filter((l) => l.length >= 15 && l.length <= 240 && REQUIREMENT_RE.test(norm(l)))
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .slice(0, 8);
  return {
    licenses: found(LICENSES),
    english: english ? (english[1] ? `Inglês ${english[1].toLowerCase()}` : "Inglês") : "",
    experience: years ? `${years[1]} ano${years[1] === "1" ? "" : "s"} de experiência` : "",
    salary: salary?.[0] ?? "",
    regime: found(REGIMES),
    highlights,
    excerpt: full.slice(0, 900),
  };
}

export async function getDetails({ source, id, url }) {
  const fetcher = FETCHERS[source];
  if (!fetcher) throw new Error("fonte desconhecida");
  if (url && !ALLOWED_HOSTS[source].test(new URL(url).hostname)) {
    throw new Error("endereço de vaga inválido para essa fonte");
  }
  try {
    const got = await fetcher({ id, url });
    const { lines: all, extra = {} } = Array.isArray(got) ? { lines: got } : got;
    const summary = summarize(all);
    const full = all.join(" ");
    return {
      ...summary,
      applicants: extra.applicants ?? "",
      seniority: extra.seniority ?? "",
      employmentType: extra.employmentType ?? "",
      jobFunction: extra.jobFunction ?? "",
      industries: extra.industries ?? "",
      // O que o anúncio completo diz sobre modelo, contrato e nível (mais confiável que o card).
      workplace: workplaceFrom(full.slice(0, 3000)),
      contract: contractFrom(extra.employmentType, full.slice(0, 3000)),
      level: levelFrom(extra.seniority),
    };
  } catch (e) {
    throw new Error(errorMessage(e, source));
  }
}
