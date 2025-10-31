import fetch from "node-fetch";

export default async function handler(req, res) {
  const q = String(req.query.q ?? "");
  const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID; // <- bez VITE_

  if (!CLIENT_ID) {
    return res.status(500).json({ error: "SOUNDCLOUD_CLIENT_ID missing on server" });
  }

  const url = `https://api-v2.soundcloud.com/search/sets?q=${encodeURIComponent(q)}&client_id=${CLIENT_ID}&limit=50`;

  try {
    const r = await fetch(url);
    const json = await r.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    return res.status(r.status).json(json);
  } catch (err) {
    console.error("proxy error:", err);
    return res.status(502).json({ error: "proxy error" });
  }
}