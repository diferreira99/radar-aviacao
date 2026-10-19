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
