// Vercel serverless function: GET /api/geocode?q=<place name>
//
// Proxies to OpenStreetMap's Nominatim geocoding service. Nominatim's usage
// policy doesn't allow calling it directly from a browser — client-side
// apps get silently rate-limited/blocked, which is why the map would work
// briefly and then stop. Routing through our own server lets us send a
// proper identifying User-Agent (required by their policy) and keeps
// browser traffic off Nominatim entirely.

const cache = new Map(); // simple per-instance cache — good enough for a demo's traffic

export default async function handler(req, res) {
  const q = (req.query.q || "").toString().trim();
  if (!q) {
    res.status(400).json({ error: "q is required" });
    return;
  }

  if (cache.has(q)) {
    res.status(200).json(cache.get(q));
    return;
  }

  try {
    const upstream = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      {
        headers: {
          // Required by Nominatim's usage policy: identify the application.
          "User-Agent": "LandmarkDemoSite/1.0 (contact: supportlandmarkglobal24zendesk@gmail.com)",
        },
      }
    );
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "geocode upstream error" });
      return;
    }
    const data = await upstream.json();
    const result = data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
    cache.set(q, result);
    res.status(200).json(result);
  } catch (e) {
    res.status(502).json({ error: "geocode failed" });
  }
}
