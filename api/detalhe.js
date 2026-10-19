import { getDetails } from "../lib/details.js";

// GET /api/detalhe?source=linkedin&id=123  ou  ?source=gupy&url=https://empresa.gupy.io/jobs/123
export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const source = url.searchParams.get("source") ?? "";
  const id = url.searchParams.get("id") || undefined;
  const jobUrl = url.searchParams.get("url") ?? "";
  if (!id && !/^https:\/\//.test(jobUrl)) {
    res.status(400).json({ error: "Informe id ou url da vaga" });
    return;
  }
  try {
    const details = await getDetails({ source, id, url: jobUrl });
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json(details);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
