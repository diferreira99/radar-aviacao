import { publicNiches, DEFAULT_NICHE } from "../lib/niches.js";

// GET /api/nichos: nichos disponíveis, com termos padrão e nomes das faixas de destaque.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({ default: DEFAULT_NICHE, niches: publicNiches() });
}
