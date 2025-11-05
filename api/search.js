export default async function handler(req, res) {
  const q = String(req.query.q ?? "");
  const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID; // <- musi być ustawione w Vercel

  if (!CLIENT_ID) {
    console.error("Missing SOUNDCLOUD_CLIENT_ID");
    return res.status(500).json({ error: "SOUNDCLOUD_CLIENT_ID missing on server" });
  }

  const url = `https://api.soundcloud.com/search/sets?q=${encodeURIComponent(q)}&client_id=${CLIENT_ID}&limit=50`;

  try {
    const r = await fetch(url);
    const text = await r.text();
    if (!r.ok) {
      console.error("SoundCloud search failed:", r.status, text);
      // zwracamy treść od SoundCloud i kod statusu dalej do klienta
      res.setHeader("Content-Type", "application/json");
      return res.status(r.status).send(text);
    }

    // spróbuj sparsować JSON, ale zwróć surowy tekst przy błędzie parsowania
    let json;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "raw:", text);
      return res.status(502).send(text);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    return res.status(200).json(json);
  } catch (err) {
    console.error("proxy error (exception):", err);
    return res.status(502).json({ error: "proxy exception", details: String(err) });
  }
}