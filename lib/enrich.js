// Traduz o que cada fonte devolve (códigos, rótulos em inglês ou português, texto livre)
// para os mesmos rótulos do site: modelo de trabalho, tipo de contrato e nível.

import { norm } from "./util.js";

export const WORKPLACES = ["Presencial", "Híbrido", "Remoto"];
export const CONTRACTS = ["Efetivo", "Estágio", "Temporário", "PJ", "Trainee", "Aprendiz", "Freelancer"];

export function workplaceFrom(...texts) {
  const t = norm(texts.filter(Boolean).join(" "));
  if (!t) return "";
  if (/hibrid|hybrid/.test(t)) return "Híbrido";
  if (/remot|home ?office|anywhere|teletrabalho|work from home/.test(t)) return "Remoto";
  if (/presencial|on-?site|in-?person|onsite/.test(t)) return "Presencial";
  return "";
}

export function contractFrom(...texts) {
  const t = norm(texts.filter(Boolean).join(" "));
  if (!t) return "";
  if (/estagi|internship|\bintern\b/.test(t)) return "Estágio";
  if (/trainee/.test(t)) return "Trainee";
  if (/aprendiz|apprentice/.test(t)) return "Aprendiz";
  if (/temporari|temporary|\btemp\b|prazo determinado/.test(t)) return "Temporário";
  if (/\bpj\b|pessoa juridica|legal.entity|contractor|prestador/.test(t)) return "PJ";
  if (/freela|freelance|autonomo/.test(t)) return "Freelancer";
  if (/\bclt\b|efetiv|permanent|effective/.test(t)) return "Efetivo";
  return "";
}

// Nível que a própria fonte informa ("Pleno", "Mid-Senior level", "Assistente"...).
export function levelFrom(...texts) {
  const t = norm(texts.filter(Boolean).join(" "));
  if (!t) return "";
  if (/estagi|internship/.test(t)) return "estagio";
  if (/trainee|aprendiz/.test(t)) return "trainee";
  if (/diretor|director|executiv|gerente|manager|coordenad|supervis|lider|lead/.test(t)) return "lideranca";
  if (/senior|sr\b|especialista|specialist|mid-senior/.test(t)) return "senior";
  if (/pleno|associate|mid\b/.test(t)) return "pleno";
  if (/junior|jr\b|entry|assistente|auxiliar|basico/.test(t)) return "junior";
  return "";
}

// Jornada: tempo integral, meio período, escalas e turnos.
export function scheduleFrom(...texts) {
  const t = norm(texts.filter(Boolean).join(" "));
  const found = [];
  if (/tempo integral|full.?time|integral\b/.test(t)) found.push("Tempo integral");
  if (/meio periodo|part.?time/.test(t)) found.push("Meio período");
  const escala = t.match(/\b(12x36|6x1|5x2|4x2|6x2)\b/);
  if (escala) found.push(`Escala ${escala[1]}`);
  if (/noturno|madrugada/.test(t)) found.push("Turno noturno");
  else if (/turno|revezamento/.test(t)) found.push("Turnos");
  return found.join(" · ");
}

// Separa as etiquetas livres de uma vaga (como os "atributos" do Indeed) por tipo.
const BENEFIT_RE = /vale|plano de saude|plano odonto|assistencia|seguro de vida|participacao nos lucros|\bplr\b|bonus|bonifica|estacionamento|auxilio|gympass|wellhub|totalpass|cesta|refeitorio|fretado|transporte|previdencia|desconto|day off|convenio|creche|academia|alimentacao|refeicao|home office|ajuda de custo|13o|ferias|licenca/;
const SCHEDULE_RE = /tempo integral|meio periodo|full.?time|part.?time|escala|turno|12x36|6x1|5x2|noturno|segunda a sexta|fins? de semana|horario/;
const CONTRACT_RE = /\bclt\b|efetiv|temporari|estagi|\bpj\b|pessoa juridica|freela|aprendiz|trainee|terceiriz|autonom/;
const WORKPLACE_EXACT = /^(trabalho )?(remoto|hibrido|presencial|100% remoto|home office integral)$/;

export function classifyLabels(labels) {
  const out = { benefits: [], skills: [], schedule: [], contract: [], workplace: [] };
  for (const label of labels.filter(Boolean)) {
    const n = norm(label);
    if (WORKPLACE_EXACT.test(n)) out.workplace.push(label);
    else if (CONTRACT_RE.test(n)) out.contract.push(label);
    else if (SCHEDULE_RE.test(n)) out.schedule.push(label);
    else if (BENEFIT_RE.test(n)) out.benefits.push(label);
    else out.skills.push(label);
  }
  return out;
}

// Campos extras com valores vazios, para toda vaga ter o mesmo formato.
export function blankExtras() {
  return {
    workplace: "", contract: "", level: "", schedule: "", pcd: false, deadline: "", logo: "",
    badges: [], benefits: [], skills: [], companyUrl: "", snippet: "",
  };
}
