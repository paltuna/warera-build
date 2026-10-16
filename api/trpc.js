// Vercel serverless function: GET /api/trpc?endpoint=NAME&input={...json...}
// A small allow-listed proxy for the WarEra tRPC API, so the page (and you)
// can try different endpoints without changing code each time.
//
// Example:
//   /api/trpc?endpoint=tradingOrder.getTopOrders&input={"itemCode":"ammo","limit":5}

const BASE = "https://api2.warera.io/trpc";

// Only these endpoints can be called, so this is not an open proxy.
const ALLOWED = [
  "itemTrading.getPrices",
  "tradingOrder.getTopOrders",
  "transaction.getPaginatedTransactions",
  "itemOffer.getById",
];

export default async function handler(req, res) {
  const endpoint = String(req.query.endpoint || "");
  if (!ALLOWED.includes(endpoint)) {
    res.status(400).json({ error: "Endpoint not allowed", allowed: ALLOWED });
    return;
  }

  let payload = {};
  if (req.query.input) {
    try {
      payload = JSON.parse(String(req.query.input));
    } catch (e) {
      res.status(400).json({ error: "input must be valid JSON" });
      return;
    }
  }

  // tRPC batch format: {BASE}/{endpoint}?batch=1&input={"0": payload}
  const input = encodeURIComponent(JSON.stringify({ 0: payload }));
  const url = `${BASE}/${endpoint}?batch=1&input=${input}`;

  const headers = { Accept: "application/json", Origin: "https://app.warera.io" };
  if (process.env.WARERA_API_KEY) headers["X-API-Key"] = process.env.WARERA_API_KEY;

  try {
    const upstream = await fetch(url, { headers });
    const body = await upstream.text();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(upstream.status).send(body);
  } catch (err) {
    res.status(502).json({ error: "Could not reach the WarEra API", detail: String(err) });
  }
}
