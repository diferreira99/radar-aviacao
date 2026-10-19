// Nichos de busca. Cada nicho traz os termos padrão, o vocabulário que separa vaga do nicho de vaga
// fora dele (pelo cargo ou pela empresa) e duas faixas de destaque para ordenar a lista.
// Para abrir um nicho novo basta acrescentar uma entrada aqui.

export const NICHES = {
  aviacao: {
    label: "Aviação",
    terms: [
      "planejador de manutenção aeronáutica", "planejamento e controle de manutenção aeronaves", "PCM aviação",
      "controle técnico de manutenção", "engenharia de manutenção aeronáutica", "manutenção de aeronaves",
      "mecânico de aeronaves", "MRO aviação", "aeronavegabilidade", "aviação", "aeronáutica",
    ],
    // LinkedIn e Indeed também casam o termo com a descrição da vaga, o que traz cargos fora do setor
    // ("Operador de CNC", "Sales Executive").
    titleWords: [
      "aero", "aeronav", "aeronaut", "aviac", "aviat", "aircraft", "airframe", "avion",
      "hangar", "mro", "ctm", "gse", "mcc", "aeroporto", "airport", "airline", "linhas aereas",
      "taxi aereo", "helicop", "helipont", "piloto", "pilot", "comissari", "anac", "rbac", "part 145",
      "turbina", "trem de pouso", "ndt", "ensaios nao destrutivos", "voo", "flight",
    ],
    companyWords: [
      "aero", "avia", "air", "airlines", "linhas aereas", "embraer", "latam", "gol linhas", "azul",
      "sideral", "airbus", "boeing", "dnata", "swissport", "orbital", "voepass", "passaredo",
      "lider aviacao", "helibras", "tam aviacao", "gru airport", "aena", "infraero",
      "rio galeao", "viracopos", "jet", "taxi aereo", "safran", "ge aerospace", "pratt",
      "rolls-royce", "honeywell", "collins", "akaer", "atech", "avibras", "mectron",
    ],
    top: {
      label: "Planejamento",
      words: ["planej", "planner", "planning", "pcm", "ctm", "controle tecnico", "programacao de manutencao",
        "aeronavegabilidade", "airworthiness", "mcc", "moc"],
    },
    mid: {
      label: "Manutenção",
      words: ["manuten", "maintenance", "mecanic", "mechanic", "tecnic", "technician", "inspetor", "inspector",
        "engenh", "engineer", "avion", "mro", "hangar", "qualidade", "quality", "gse", "ndt", "estrutur"],
    },
    base: "Setor aéreo",
    outside: "fora do setor",
    // Requisitos que costumam aparecer nas vagas do nicho; usados para comparar com o perfil da pessoa.
    requirements: [
      "CHT", "CMA", "CCF", "ANAC", "célula", "GMP", "aviônicos", "B1", "B2", "RBAC 145", "RBAC 43", "RBAC 121", "RBAC 135",
      "Part 145", "EASA", "FAA", "MGM", "MOE", "AMOS", "TRAX", "SAP PM", "ATA 100", "manual de manutenção", "IPC", "AMM",
      "programa de manutenção", "diretrizes de aeronavegabilidade", "boletins de serviço", "controle técnico de manutenção",
      "PCM", "boroscopia", "ensaios não destrutivos", "NDT", "fatores humanos", "SMS", "inspeção", "Airbus", "Boeing",
      "Embraer", "ATR", "turbohélice", "jato executivo", "helicóptero",
    ],
    // Siglas e sinônimos que valem pelo mesmo requisito.
    aliases: { NDT: "ensaios não destrutivos", "Part 145": "RBAC 145", AMM: "manual de manutenção", CTM: "controle técnico de manutenção" },
  },
  livre: {
    label: "Livre",
    terms: [],
    titleWords: [],
    companyWords: [],
    top: null,
    mid: null,
    base: "",
    outside: "",
    requirements: [],
    aliases: {},
  },
};

export const DEFAULT_NICHE = "aviacao";

export function getNiche(key) {
  return NICHES[key] ?? NICHES[DEFAULT_NICHE];
}

// O que o site precisa saber de cada nicho (sem as listas de vocabulário).
export function publicNiches() {
  return Object.fromEntries(
    Object.entries(NICHES).map(([key, n]) => [
      key,
      {
        label: n.label,
        terms: n.terms,
        categories: { 3: n.top?.label ?? "", 2: n.mid?.label ?? "", 1: n.base },
        filters: n.titleWords.length > 0,
        outside: n.outside,
        requirements: n.requirements ?? [],
        aliases: n.aliases ?? {},
      },
    ])
  );
}
