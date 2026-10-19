import { norm } from "./util.js";

// LinkedIn e Indeed também casam o termo com a descrição da vaga, o que traz cargos fora do setor
// ("Operador de CNC", "Sales Executive"). Uma vaga conta como de aviação quando o cargo ou a
// empresa tem vocabulário do setor.
const TITLE_WORDS = [
  "aero", "aeronav", "aeronaut", "aviac", "aviat", "aircraft", "airframe", "avion",
  "hangar", "mro", "ctm", "gse", "mcc", "aeroporto", "airport", "airline", "linhas aereas",
  "taxi aereo", "helicop", "helipont", "piloto", "pilot", "comissari", "anac", "rbac", "part 145",
  "turbina", "trem de pouso", "ndt", "ensaios nao destrutivos", "voo", "flight",
];
const COMPANY_WORDS = [
  "aero", "avia", "air", "airlines", "linhas aereas", "embraer", "latam", "gol linhas", "azul",
  "sideral", "airbus", "boeing", "dnata", "swissport", "orbital", "voepass", "passaredo",
  "lider aviacao", "helibras", "tam aviacao", "gru airport", "aena", "infraero",
  "rio galeao", "viracopos", "jet", "taxi aereo", "safran", "ge aerospace", "pratt",
  "rolls-royce", "honeywell", "collins", "akaer", "atech", "avibras", "mectron",
];

const words = (list) => new RegExp(`(^|[^a-z0-9])(${list.map((w) => w.replace(/[-]/g, "\\-")).join("|")})`);
const TITLE_RE = words(TITLE_WORDS);
const COMPANY_RE = words(COMPANY_WORDS);

export function isAviation({ title, company }) {
  return TITLE_RE.test(norm(title)) || COMPANY_RE.test(norm(company));
}

// Nota para ordenar a lista: planejamento primeiro, depois manutenção e engenharia, depois o resto do setor.
const PLANNING_RE = /(^|[^a-z])(planej|planner|planning|pcm|ctm|controle tecnico|programacao de manutencao|aeronavegabilidade|airworthiness|mcc|moc)/;
const MAINTENANCE_RE = /(^|[^a-z])(manuten|maintenance|mecanic|mechanic|tecnic|technician|inspetor|inspector|engenh|engineer|avion|mro|hangar|qualidade|quality|gse|ndt|estrutur)/;

export const CATEGORIES = { 3: "Planejamento", 2: "Manutenção e engenharia", 1: "Setor aéreo", 0: "Fora do setor" };

export function score(job) {
  if (!isAviation(job)) return 0;
  const t = norm(job.title);
  if (PLANNING_RE.test(t)) return 3;
  if (MAINTENANCE_RE.test(t)) return 2;
  return 1;
}
