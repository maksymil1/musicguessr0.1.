import { pipeline } from "stream";
import { promisify } from "util";
const streamPipeline = promisify(pipeline);

export default async function handler(req, res) {
  try {
    let id = req.query.id;
    if (!id) {
      const m = req.url && req.url.match(/\/api\/stream\/([^/?]+)/);
      if (m) id = decodeURIComponent(m[1]);
    }

    const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;

    console.log("stream handler - hasId:", !!id, "hasClientId:", !!CLIENT_ID);

    if (!id) return res.status(400).json({ error: "Missing track ID" });
    if (!CLIENT_ID)
      return res
        .status(500)
        .json({ error: "Missing SoundCloud Client ID in environment variables" });

    const infoRes = await fetch(
      `https://api.soundcloud.com/tracks/${id}?client_id=${CLIENT_ID}`
    );
    if (!infoRes.ok) {
      const txt = await infoRes.text();
      console.error("track info fetch failed:", infoRes.status, txt);
      return res
        .status(infoRes.status)
        .json({ error: "Could not fetch track info", details: txt });
    }
    const track = await infoRes.json();

    let streamUrl = track.stream_url;
    if (!streamUrl && track.media && Array.isArray(track.media.transcodings)) {
      const prog = track.media.transcodings.find(
        (t) => t.format && t.format.protocol === "progressive"
      );
      if (prog && prog.url) {
        const r = await fetch(`${prog.url}?client_id=${CLIENT_ID}`);
        if (r.ok) {
          const j = await r.json();
          streamUrl = j.url;
        } else {
          console.error("transcoding url fetch failed:", r.status, await r.text());
        }
      }
    }

    if (!streamUrl) return res.status(404).json({ error: "Track has no stream_url" });

    const streamRes = await fetch(`${streamUrl}?client_id=${CLIENT_ID}`);
    if (!streamRes.ok) {
      const txt = await streamRes.text();
      console.error("stream fetch failed:", streamRes.status, txt);
      return res
        .status(streamRes.status)
        .json({ error: "Could not fetch stream", details: txt });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", streamRes.headers.get("content-type") || "audio/mpeg");

    const body = streamRes.body;
    if (!body) return res.status(500).json({ error: "No stream body" });

    // Jeśli body ma pipe (node-fetch), użyj bezpośrednio; inaczej konwertuj web stream na Node stream:
    if (typeof body.pipe === "function") {
      body.pipe(res);
    } else {
      const nodeStream = require("stream").Readable.from(body);
      await streamPipeline(nodeStream, res);
    }
  } catch (err) {
    console.error("proxy exception", err);
    res.status(500).json({ error: "proxy exception", details: String(err) });
  }
}
// ...existing code...