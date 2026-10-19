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
  if (/\bclt\b|efetiv|permanent|full.?time|tempo integral|effective/.test(t)) return "Efetivo";
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

// Campos extras com valores vazios, para toda vaga ter o mesmo formato.
export function blankExtras() {
  return { workplace: "", contract: "", level: "", pcd: false, deadline: "", logo: "", badges: [], companyUrl: "", snippet: "" };
}
