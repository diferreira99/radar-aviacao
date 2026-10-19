import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJobs } from "./linkedin.js";

const SAMPLE = `
<li>
  <div class="base-card relative w-full base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4012345678" data-impression-id="x">
    <a class="base-card__full-link absolute top-0 right-0" href="https://br.linkedin.com/jobs/view/planejador-de-manuten%C3%A7%C3%A3o-4012345678?position=1&amp;pageNum=0&amp;refId=abc" data-tracking-control-name="public_jobs_jserp-result_search-card">
      <span class="sr-only">Planejador de Manutenção Aeronáutica</span>
    </a>
    <div class="base-search-card__info">
      <h3 class="base-search-card__title">
        Planejador de Manutenção Aeronáutica
      </h3>
      <h4 class="base-search-card__subtitle">
        <a class="hidden-nested-link" href="https://br.linkedin.com/company/x">
          Táxi Aéreo &amp; Cia
        </a>
      </h4>
      <div class="base-search-card__metadata">
        <span class="job-search-card__location">
          São Paulo, SP
        </span>
        <time class="job-search-card__listdate--new" datetime="2026-10-18">
          1 dia atrás
        </time>
      </div>
    </div>
  </div>
</li>
<li>
  <div class="base-card" data-entity-urn="urn:li:jobPosting:4099999999">
    <a class="base-card__full-link" href="https://br.linkedin.com/jobs/view/mecanico-4099999999?position=2">x</a>
    <h3 class="base-search-card__title">Mecânico de Aeronaves</h3>
    <h4 class="base-search-card__subtitle"><a>GOL</a></h4>
    <span class="job-search-card__location">Guarulhos, SP</span>
    <span class="job-search-card__salary-info">R$ 5.000,00/mês</span>
    <time class="job-search-card__listdate" datetime="2026-10-10">1 semana atrás</time>
  </div>
</li>`;

test("parseJobs extrai os campos de cada card", () => {
  const jobs = parseJobs(SAMPLE);
  assert.equal(jobs.length, 2);
  assert.deepEqual(jobs[0], {
    id: "4012345678",
    title: "Planejador de Manutenção Aeronáutica",
    company: "Táxi Aéreo & Cia",
    location: "São Paulo, SP",
    salary: "",
    date: "2026-10-18",
    posted: "1 dia atrás",
    url: "https://br.linkedin.com/jobs/view/planejador-de-manuten%C3%A7%C3%A3o-4012345678",
  });
  assert.equal(jobs[1].salary, "R$ 5.000,00/mês");
  assert.equal(jobs[1].company, "GOL");
});

test("parseJobs ignora HTML sem vagas", () => {
  assert.deepEqual(parseJobs("<html><body>nada</body></html>"), []);
});
