import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLabels, contractFrom, workplaceFrom } from "./enrich.js";

// Etiquetas reais do Indeed (out/2026).
test("separa os atributos do Indeed por tipo", () => {
  const c = classifyLabels(["Software de produtividade para escritório", "Manutenção de registros", "Participação nos lucros",
    "Vale-refeição", "Tempo integral", "Aeroporto", "Manutenção de Aeronaves", "Efetivo CLT", "Estacionamento gratuito"]);
  assert.deepEqual(c.benefits, ["Participação nos lucros", "Vale-refeição", "Estacionamento gratuito"]);
  assert.deepEqual(c.schedule, ["Tempo integral"]);
  assert.deepEqual(c.contract, ["Efetivo CLT"]);
  assert.deepEqual(c.workplace, []);
  assert.ok(c.skills.includes("Manutenção de Aeronaves"));
});

test("tempo integral não é tipo de contrato e etiqueta solta não vira remoto", () => {
  assert.equal(contractFrom("Tempo integral"), "");
  assert.equal(workplaceFrom("", "Campinas, SP", "Desenvolvedor de Hardware / CAMPINAS/SP"), "");
});
