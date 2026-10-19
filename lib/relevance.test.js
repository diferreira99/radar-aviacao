import { test } from "node:test";
import assert from "node:assert/strict";
import { isAviation } from "./relevance.js";

// Vagas reais devolvidas pela busca em out/2026.
const KEEP = [
  ["Auxiliar Técnico(a) de Manutenção de Aeronaves (Hangar) - CGH Congonhas", "Gol Linhas Aéreas"],
  ["Analista de CTM (Controle Técnico de Manutenção) - LEM", ""],
  ["CONTROLADOR MCC I", "Azul Linhas Aéreas Brasileiras"],
  ["CGH- Manutenção (GSE)", "dnata"],
  ["Especialista de Manutenção II (Aeronaves)", "Selpe"],
  ["Senior Aircraft Maintenance Professional", "Airbus"],
  ["Oficial de Manutenção I", "GRU Airport - Aeroporto Internacional de São Paulo"],
  ["ELETRICISTA AVIÔNICO SÊNIOR", ""],
  ["Engenheiro da Garantia da Qualidade Aeronáutica", "Thales"],
  ["Estágio Qualidade - POA", "Aeromot Aeronaves e Motores"],
];
const DROP = [
  ["Operador de CNC", "BM Seleção"],
  ["Ferramenteiro", "Renove Consultoria Gestão Empresarial"],
  ["Afiador de Ferramentas", "Renove Consultoria Gestão Empresarial"],
  ["Projetista Elétrico", "Alliança RH"],
  ["Desenvolvedor de Hardware / CAMPINAS/SP", "KRYPTUS"],
  ["Instrutor de Formação Profissional - Metalurgia", "SENAI"],
  ["AUXILIAR DE ELÉTRICA", ""],
  ["Especialista de Manutenção III", "Selpe Vagas"],
  ["Gerente de Vendas B2B", "Omnichannel SA"],
];

test("mantém vagas do setor aéreo", () => {
  for (const [title, company] of KEEP) assert.ok(isAviation({ title, company }), title);
});

test("descarta vagas fora do setor", () => {
  for (const [title, company] of DROP) assert.ok(!isAviation({ title, company }), title);
});
