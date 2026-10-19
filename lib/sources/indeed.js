// Indeed: API GraphQL do aplicativo do Indeed, a mesma usada pelo JobSpy (github.com/speedyapply/JobSpy).

import { isoDate, errorMessage } from "../util.js";

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

function query({ term, where, period, cursor }) {
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
        key
        title
        datePublished
        location { formatted { long } }
        employer { name }
      }
    }
  }
}`;
}

export function parseJobs(data) {
  return (data?.data?.jobSearch?.results ?? []).map(({ job }) => ({
    id: job.key,
    title: job.title ?? "",
    company: job.employer?.name ?? "",
    location: job.location?.formatted?.long ?? "",
    salary: "",
    date: job.datePublished ? isoDate(new Date(job.datePublished)) : "",
    posted: "",
    url: `https://br.indeed.com/viewjob?jk=${job.key}`,
  }));
}

export async function search({ term, loc, period, pages }) {
  const out = [];
  let cursor = null;
  try {
    for (let page = 0; page < Math.min(pages, 2); page++) {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ query: query({ term, where: loc.indeed, period, cursor }) }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { jobs: out, error: `Indeed respondeu ${res.status}` };
      const data = await res.json();
      if (data.errors?.length && !data.data?.jobSearch) {
        return { jobs: out, error: `Indeed: ${data.errors[0].message}` };
      }
      out.push(...parseJobs(data));
      cursor = data.data?.jobSearch?.pageInfo?.nextCursor;
      if (!cursor) break;
    }
    return { jobs: out, error: null };
  } catch (e) {
    return { jobs: out, error: errorMessage(e, "Indeed") };
  }
}
