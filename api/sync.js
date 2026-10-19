// POST /api/sync  { action: "get", code }  ou  { action: "set", code, key, status, title, company, url }
// Repassa para o webhook do n8n que guarda os status por código de sincronização.
const WEBHOOK = process.env.SYNC_WEBHOOK_URL || "https://primary-production-c1c7c.up.railway.app/webhook/radar-emprego-sync";
const TOKEN = process.env.SYNC_TOKEN || "a71007f39626faff24898baed97acf3bdcc2";
const STATUSES = new Set(["vista", "candidatei", "entrevista", "descartada"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const { action, code } = body;
  if (!/^[A-Za-z0-9-]{8,40}$/.test(code ?? "")) {
    res.status(400).json({ error: "código inválido" });
    return;
  }
  let payload;
  if (action === "get") {
    payload = { action, code };
  } else if (action === "set") {
    const status = body.status ?? null;
    if (typeof body.key !== "string" || !body.key || (status !== null && !STATUSES.has(status))) {
      res.status(400).json({ error: "vaga ou status inválido" });
      return;
    }
    const cut = (v, n) => String(v ?? "").slice(0, n);
    payload = { action, code, key: cut(body.key, 300), status, title: cut(body.title, 200), company: cut(body.company, 120), url: cut(body.url, 500) };
  } else {
    res.status(400).json({ error: "ação inválida" });
    return;
  }
  try {
    const r = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json", "x-radar-token": TOKEN },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `n8n respondeu ${r.status}`);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(action === "get" ? { statuses: data.statuses ?? {} } : { ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
