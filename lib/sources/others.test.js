import { test } from "node:test";
import assert from "node:assert/strict";
import * as gupy from "./gupy.js";
import * as vagas from "./vagas.js";
import * as indeed from "./indeed.js";
import { LOCATIONS } from "../locations.js";

const today = new Date().toISOString().slice(0, 10);

test("gupy filtra pela cidade e pelo período", () => {
  const data = {
    data: [
      { id: 1, name: "Mecânico de Aeronaves", careerPageName: "LATAM", city: "São Paulo", state: "São Paulo", publishedDate: today + "T10:00:00Z", jobUrl: "https://latam.gupy.io/jobs/1" },
      { id: 2, name: "Técnico", careerPageName: "GOL", city: "Guarulhos", state: "SP", publishedDate: today + "T10:00:00Z", jobUrl: "https://gol.gupy.io/jobs/2" },
      { id: 3, name: "Antiga", careerPageName: "X", city: "São Paulo", state: "São Paulo", publishedDate: "2020-01-01T00:00:00Z", jobUrl: "u" },
    ],
  };
  const jobs = gupy.parseJobs(data, { loc: LOCATIONS.sp, period: "month" });
  assert.deepEqual(jobs.map((j) => j.id), ["1"]);
  assert.equal(jobs[0].company, "LATAM");
  assert.equal(jobs[0].date, today);
  assert.equal(gupy.parseJobs(data, { loc: LOCATIONS.estado, period: "any" }).length, 3);
});

test("vagas.com.br lê os cards e filtra pela região", () => {
  const html = `
<li class="vaga even ">
  <h2 class="cargo"><a class="link-detalhes-vaga" title="Inspetor de Manuten&ccedil;&atilde;o Aeron&aacute;utica" data-id-vaga="2734567" href="/vagas/v2734567/inspetor-de-manutencao-aeronautica">Inspetor</a></h2>
  <span class="emprVaga">Táxi Aéreo X</span>
  <footer><span class="vaga-local"><i></i> São Paulo / SP</span><span class="data-publicacao">Hoje</span></footer>
</li>
<li class="vaga odd ">
  <h2 class="cargo"><a class="link-detalhes-vaga" title="Mecânico" href="/vagas/v2700000/mecanico">Mecânico</a></h2>
  <span class="emprVaga">Oficina Y</span>
  <div class="detalhes"><span class="vaga-local"><span class="icon-local"></span>
    Belo Horizonte / MG
  </span></div><span class="data-publicacao">01/10/2026</span>
</li>`;
  const jobs = vagas.parseJobs(html, { loc: LOCATIONS.sp, period: "week" });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].id, "2734567");
  assert.equal(jobs[0].title, "Inspetor de Manutenção Aeronáutica");
  assert.equal(jobs[0].company, "Táxi Aéreo X");
  assert.equal(jobs[0].location, "São Paulo / SP");
  assert.equal(jobs[0].date, today);
  assert.equal(jobs[0].url, "https://www.vagas.com.br/vagas/v2734567/inspetor-de-manutencao-aeronautica");
  const all = vagas.parseJobs(html, { loc: LOCATIONS.br, period: "any" });
  assert.equal(all.length, 2);
  assert.equal(all[1].location, "Belo Horizonte / MG");
});

test("vagas.com.br usa a cidade do cargo quando o card não traz local", () => {
  const html = `<li class="vaga odd "><h2 class="cargo"><a class="link-detalhes-vaga" title="Técnico Mecânico de Aeronaves - Sorocaba/SP" href="/vagas/v2837506/x">x</a></h2>
    <span class="emprVaga">Líder Aviação</span><span class="data-publicacao">01/10/2026</span></li>`;
  const [job] = vagas.parseJobs(html, { loc: LOCATIONS.estado, period: "any" });
  assert.equal(job.location, "Sorocaba / SP");
  assert.equal(vagas.parseJobs(html, { loc: LOCATIONS.sp, period: "any" }).length, 0);
});

test("indeed converte a resposta GraphQL", () => {
  const jobs = indeed.parseJobs({
    data: { jobSearch: { results: [{ job: { key: "abc123", title: "Técnico de Manutenção Aeronáutica", datePublished: Date.parse("2026-10-15T08:00:00Z"), location: { formatted: { long: "Guarulhos, SP" } }, employer: { name: "Azul" } } }] } },
  });
  assert.deepEqual(jobs[0], {
    id: "abc123", title: "Técnico de Manutenção Aeronáutica", company: "Azul", location: "Guarulhos, SP",
    salary: "", date: "2026-10-15", posted: "", url: "https://br.indeed.com/viewjob?jk=abc123",
  });
});
