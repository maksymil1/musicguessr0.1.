// api/stream.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const CLIENT_ID = process.env.VITE_SOUNDCLOUD_CLIENT_ID;

    if (!id) {
      return res.status(400).json({ error: "Missing track ID" });
    }

    if (!CLIENT_ID) {
      return res.status(500).json({ error: "Missing SoundCloud Client ID in environment variables" });
    }

    // 1. Pobierz info o utworze, żeby uzyskać stream_url
    const infoRes = await fetch(`https://api.soundcloud.com/tracks/${id}?client_id=${CLIENT_ID}`);
    const track = await infoRes.json();

    if (!track.stream_url) {
      return res.status(404).json({ error: "Track has no stream_url" });
    }

    // 2. Uzyskaj prawdziwy strumień (SoundCloud da redirect do MP3)
    const streamRes = await fetch(`${track.stream_url}?client_id=${CLIENT_ID}`);

    if (!streamRes.ok) {
      return res.status(streamRes.status).json({ error: "Could not fetch stream" });
    }

    // 3. Ustaw nagłówki CORS i typ pliku
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "audio/mpeg");

    // 4. Przekazuj strumień dalej (pipe)
    streamRes.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
}
