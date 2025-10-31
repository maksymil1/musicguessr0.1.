import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // obsłuż id z query (?id=) lub z URL /api/stream/{id}
    let id = req.query.id;
    if (!id) {
      // spróbuj wyciągnąć segment ścieżki
      const m = req.url && req.url.match(/\/api\/stream\/([^/?]+)/);
      if (m) id = decodeURIComponent(m[1]);
    }

    const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID; // <- zmiana: bez VITE_

    if (!id) {
      return res.status(400).json({ error: "Missing track ID" });
    }

    if (!CLIENT_ID) {
      return res.status(500).json({ error: "Missing SoundCloud Client ID in environment variables" });
    }

    // pobierz info o utworze
    const infoRes = await fetch(`https://api.soundcloud.com/tracks/${id}?client_id=${CLIENT_ID}`);
    if (!infoRes.ok) {
      const txt = await infoRes.text();
      console.error("track info fetch failed:", infoRes.status, txt);
      return res.status(infoRes.status).json({ error: "Could not fetch track info", details: txt });
    }
    const track = await infoRes.json();

    // stream_url może być w track.media.transcodings (nowe API) -> poszukaj progressive url
    let streamUrl = track.stream_url;
    if (!streamUrl && track.media && Array.isArray(track.media.transcodings)) {
      const prog = track.media.transcodings.find(t => t.format && t.format.protocol === "progressive");
      if (prog && prog.url) {
        // musimy pobrać url z transcodingu (z klient_id)
        const r = await fetch(`${prog.url}?client_id=${CLIENT_ID}`);
        if (r.ok) {
          const j = await r.json();
          streamUrl = j.url;
        }
      }
    }

    if (!streamUrl) {
      return res.status(404).json({ error: "Track has no stream_url" });
    }

    // pobierz rzeczywisty strumień (może być redirect)
    const streamRes = await fetch(`${streamUrl}?client_id=${CLIENT_ID}`);
    if (!streamRes.ok) {
      const txt = await streamRes.text();
      console.error("stream fetch failed:", streamRes.status, txt);
      return res.status(streamRes.status).json({ error: "Could not fetch stream", details: txt });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", streamRes.headers.get("content-type") || "audio/mpeg");

    // pipe strumienia do odpowiedzi
    streamRes.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
}