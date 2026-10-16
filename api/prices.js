// Vercel serverless function: GET /api/prices
// Fetches market prices from the WarEra tRPC API and returns the raw JSON,
// cached for 60 seconds so the API is not hit on every page load.
//
// Optional: set WARERA_API_KEY in your Vercel project settings for higher rate limits.

const BASE = "https://api2.warera.io/trpc";
const ENDPOINT = "itemTrading.getPrices";

export default async function handler(req, res) {
  // tRPC batch format: {BASE}/{endpoint}?batch=1&input={urlencoded json}
  // The input below is a first guess for an endpoint with no arguments.
  // If the response is an error, compare with the request the game's own site sends.
  const input = encodeURIComponent(JSON.stringify({ 0: {} }));
  const url = `${BASE}/${ENDPOINT}?batch=1&input=${input}`;

  const headers = {
    Accept: "application/json",
    Origin: "https://app.warera.io",
  };
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
