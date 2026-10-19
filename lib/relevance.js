import { norm } from "./util.js";
import { getNiche, DEFAULT_NICHE } from "./niches.js";

// Uma vaga é do nicho quando o cargo ou a empresa tem o vocabulário dele. Nichos sem vocabulário
// (como o "Livre") aceitam tudo.
const words = (list) =>
  list.length ? new RegExp(`(^|[^a-z0-9])(${list.map((w) => w.replace(/[-]/g, "\\-")).join("|")})`) : null;

const compiled = new Map();
function rules(nicheKey) {
  if (!compiled.has(nicheKey)) {
    const n = getNiche(nicheKey);
    compiled.set(nicheKey, {
      title: words(n.titleWords),
      company: words(n.companyWords),
      top: words(n.top?.words ?? []),
      mid: words(n.mid?.words ?? []),
    });
  }
  return compiled.get(nicheKey);
}

export function isRelevant({ title, company }, nicheKey = DEFAULT_NICHE) {
  const r = rules(nicheKey);
  if (!r.title && !r.company) return true;
  return Boolean(r.title?.test(norm(title)) || r.company?.test(norm(company)));
}

export function isAviation(job) {
  return isRelevant(job, "aviacao");
}

// Nota para ordenar a lista: 3 = faixa de destaque do nicho, 2 = segunda faixa, 1 = resto do nicho, 0 = fora.
export function score(job, nicheKey = DEFAULT_NICHE) {
  if (!isRelevant(job, nicheKey)) return 0;
  const r = rules(nicheKey);
  const t = norm(job.title);
  if (r.top?.test(t)) return 3;
  if (r.mid?.test(t)) return 2;
  return 1;
}
