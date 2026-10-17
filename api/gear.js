// Vercel serverless function: GET /api/gear
// Reads recent equipment sales from WarEra and returns the median price per item code.
// Needs the WARERA_API_KEY environment variable (the sales feed requires a token).

const BASE = "https://api2.warera.io/trpc";
const PAGES = 6;
const LIMIT = 100;

export default async function handler(req, res) {
  const headers = { Accept: "application/json", Origin: "https://app.warera.io" };
  if (process.env.WARERA_API_KEY) headers["X-API-Key"] = process.env.WARERA_API_KEY;

  const byCode = {};
  let sample = 0;
  let cursor;

  try {
    for (let p = 0; p < PAGES; p++) {
      const payload = { limit: LIMIT, transactionType: "itemMarket" };
      if (cursor) payload.cursor = cursor;
      const input = encodeURIComponent(JSON.stringify({ 0: payload }));
      const up = await fetch(`${BASE}/transaction.getPaginatedTransactions?batch=1&input=${input}`, { headers });
      const json = await up.json();
      const data = json && json[0] && json[0].result && json[0].result.data;
      if (!data) {
        res.status(up.status || 502).json({ error: "Unexpected response", detail: json });
        return;
      }
      for (const t of data.items || []) {
        const it = t.item;
        // Weapons may not be typed "equipment", so keep any item sold at full durability.
        if (!it || (it.state !== undefined && it.state !== it.maxState)) continue;
        (byCode[t.itemCode] = byCode[t.itemCode] || []).push(t.money / (t.quantity || 1));
        sample++;
      }
      cursor = data.nextCursor;
      if (!cursor) break;
    }
  } catch (err) {
    res.status(502).json({ error: "Could not reach the WarEra API", detail: String(err) });
    return;
  }

  const codes = {};
  for (const [code, arr] of Object.entries(byCode)) {
    arr.sort((a, b) => a - b);
    const mid = arr.length >> 1;
    const median = arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    codes[code] = { median, min: arr[0], count: arr.length };
  }

  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  res.status(200).json({ sample, codes });
}
