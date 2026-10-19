import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "./details.js";
import { score } from "./relevance.js";

test("summarize destaca licenças, inglês, experiência, salário e requisitos", () => {
  const s = summarize([
    "Sobre a vaga",
    "Requisitos:",
    "Licença ANAC com habilitação CHT em Célula e GMP",
    "Inglês técnico para leitura de manuais",
    "Mínimo 3 anos de experiência em manutenção de linha (RBAC 145)",
    "Salário: R$ 6.500,00 + benefícios. Contratação CLT, escala 12x36.",
  ]);
  assert.deepEqual(s.licenses, ["CHT", "ANAC", "Célula", "GMP", "RBAC 145"]);
  assert.equal(s.english, "Inglês técnico");
  assert.equal(s.experience, "3 anos de experiência");
  assert.equal(s.salary, "R$ 6.500,00");
  assert.deepEqual(s.regime, ["CLT", "Turnos"]);
  assert.ok(s.highlights.some((l) => l.startsWith("Licença ANAC")));
});

test("score ordena planejamento > manutenção > resto do setor > fora", () => {
  assert.equal(score({ title: "Analista de Planejamento de Manutenção Jr", company: "Táxi Aéreo X" }), 3);
  assert.equal(score({ title: "Analista de CTM", company: "" }), 3);
  assert.equal(score({ title: "Técnico(a) de Manutenção de Aeronaves", company: "GOL Linhas Aéreas" }), 2);
  assert.equal(score({ title: "Sales Executive", company: "Aeromexico" }), 1);
  assert.equal(score({ title: "Operador de CNC", company: "BM Seleção" }), 0);
});

test("anúncio do LinkedIn: candidatos e critérios estruturados", async () => {
  const { getDetails } = await import("./details.js");
  const html = `<div class="show-more-less-html__markup"><p>Requisitos:</p><ul><li>Licença ANAC CHT em GMP</li><li>Trabalho presencial no hangar de Guarulhos</li></ul></div>
    <figcaption class="num-applicants__caption">Mais de 100 candidatos</figcaption>
    <ul class="description__job-criteria-list">
      <li><h3 class="description__job-criteria-subheader">Nível de experiência</h3><span class="description__job-criteria-text">Pleno-sênior</span></li>
      <li><h3 class="description__job-criteria-subheader">Tipo de emprego</h3><span class="description__job-criteria-text">Tempo integral</span></li>
      <li><h3 class="description__job-criteria-subheader">Função</h3><span class="description__job-criteria-text">Engenharia</span></li>
      <li><h3 class="description__job-criteria-subheader">Setores</h3><span class="description__job-criteria-text">Aviação e aeroespacial</span></li>
    </ul>`;
  const real = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => html });
  try {
    const d = await getDetails({ source: "linkedin", url: "https://br.linkedin.com/jobs/view/tecnico-4471697633" });
    assert.equal(d.applicants, "Mais de 100 candidatos");
    assert.equal(d.seniority, "Pleno-sênior");
    assert.equal(d.employmentType, "Tempo integral");
    assert.equal(d.industries, "Aviação e aeroespacial");
    // "Tempo integral" é jornada, não tipo de contrato.
    assert.equal(d.contract, "");
    assert.equal(d.schedule, "Tempo integral");
    assert.equal(d.workplace, "Presencial");
    assert.deepEqual(d.licenses, ["CHT", "ANAC", "GMP"]);
  } finally {
    globalThis.fetch = real;
  }
});
