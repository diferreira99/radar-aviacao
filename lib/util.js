// Funções comuns às fontes de vagas.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ordm: "º", ordf: "ª" };
// Acentos em entidades nomeadas (&ccedil;, &atilde;, &Eacute;...) viram letra + acento combinante.
const ACCENTS = { acute: "\u0301", grave: "\u0300", circ: "\u0302", tilde: "\u0303", cedil: "\u0327", uml: "\u0308" };

export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/json",
};

export function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z])(acute|grave|circ|tilde|cedil|uml);/gi, (_, l, a) => (l + ACCENTS[a.toLowerCase()]).normalize("NFC"))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export function text(html) {
  return decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

export function pick(html, re) {
  const m = html.match(re);
  return m ? text(m[1]) : "";
}

// Minúsculas e sem acentos, para comparar nomes de cidades e cargos.
export function norm(s) {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function isoDate(d) {
  return d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : "";
}

export const PERIOD_DAYS = { "24h": 1, week: 7, month: 30, any: Infinity };

export function withinPeriod(date, period) {
  const days = PERIOD_DAYS[period] ?? Infinity;
  if (days === Infinity || !date) return true;
  return (Date.now() - new Date(date + "T12:00:00Z").getTime()) / 86400000 <= days + 1;
}

export function errorMessage(e, site) {
  return e.name === "TimeoutError" ? `${site} demorou para responder` : e.message;
}
