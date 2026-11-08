// GET /api/rates?base=ZAR
// → { country, base, rates } — the visitor's country (from Vercel's geo header) and
//   live exchange rates for the base currency. Cached at the edge for 12 hours.

const CODE = /^[A-Z]{3}$/;

export default async function handler(req, res) {
  const base = String(req.query?.base || "ZAR").toUpperCase();
  const country = String(req.headers["x-vercel-ip-country"] || "").toUpperCase() || null;

  // The country differs per visitor, so only the visitor's browser may cache this
  res.setHeader("Cache-Control", "private, max-age=3600");

  if (!CODE.test(base)) return res.status(400).json({ error: "Invalid base currency." });
  return res.status(200).json({ country, base, rates: await getRates(base) });
}

// Exchange rates are the same for everyone → keep them in memory for 12 hours
const cache = new Map();
async function getRates(base) {
  const hit = cache.get(base);
  if (hit && Date.now() - hit.at < 12 * 3600 * 1000) return hit.rates;
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const j = await r.json();
    if (j && j.result === "success" && j.rates) {
      cache.set(base, { at: Date.now(), rates: j.rates });
      return j.rates;
    }
  } catch (err) {
    console.error("rates fetch failed", err);
  }
  return hit?.rates || null;
}
