// ...existing code...
export default async function handler(req: any, res: any) {
  try {
    // support array or string id
    const rawId = req.query?.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.statusCode = 400;
      return res.end("Missing track ID");
    }

    // dynamic import to avoid bundler/runtime issues
    const mod = await import("../getClientToken");
    const getClientToken = mod.getClientToken;
    const token = await getClientToken();
    if (!token) {
      res.statusCode = 500;
      return res.end("No SoundCloud token available");
    }

    const headers = {
      Authorization: `OAuth ${token}`,
      "User-Agent": "soundcloud-proxy/1.0",
      Accept: "application/json",
    };

    // 1) Pobierz dane utworu
    const trackRes = await fetch(`https://api.soundcloud.com/tracks/${encodeURIComponent(id)}`, { headers });
    const trackText = await trackRes.text().catch(() => "");
    if (!trackRes.ok) {
      console.error("Track info fetch failed:", trackRes.status, trackText);
      res.setHeader("Content-Type", "application/json");
      res.statusCode = trackRes.status || 502;
      return res.end(trackText || JSON.stringify({ error: "Failed to fetch track" }));
    }

    let trackData: any = null;
    try {
      trackData = JSON.parse(trackText);
    } catch (e) {
      console.error("Failed to parse track JSON:", e, "raw:", trackText);
      res.statusCode = 502;
      return res.end("Invalid track info response");
    }

    const transcodings = trackData?.media?.transcodings;
    if (!Array.isArray(transcodings) || transcodings.length === 0) {
      console.error("No transcodings for track:", id, trackData);
      res.statusCode = 404;
      return res.end("No media/transcodings available for this track");
    }

    // 2) wybierz najlepszy progressive/mp3 transcoding
    const progressive = transcodings.find((t: any) => t.format?.protocol === "progressive");
    const mp3Like = transcodings.find((t: any) => (t.format?.mime_type || "").includes("audio"));
    const transcoding = progressive || mp3Like || transcodings[0];

    if (!transcoding?.url) {
      console.error("No transcoding url found:", transcoding, transcodings);
      res.statusCode = 404;
      return res.end("No transcoding url found");
    }

    // 3) pobierz JSON zawierający rzeczywisty URL strumienia
    const streamRes = await fetch(transcoding.url, { headers });
    const streamText = await streamRes.text().catch(() => "");
    if (!streamRes.ok) {
      console.error("Failed to get stream JSON:", streamRes.status, streamText);
      res.setHeader("Content-Type", "application/json");
      res.statusCode = streamRes.status || 502;
      return res.end(streamText || JSON.stringify({ error: "Failed to get stream URL" }));
    }

    let streamData: any = null;
    try {
      streamData = JSON.parse(streamText);
    } catch (e) {
      console.error("Failed to parse stream JSON:", e, "raw:", streamText);
      res.statusCode = 502;
      return res.end("Invalid stream URL response");
    }

    if (!streamData?.url) {
      console.error("Stream JSON has no url:", streamData);
      res.statusCode = 502;
      return res.end("No stream URL returned");
    }

    // 4) Redirect do CDN (ustaw CORS header przed redirectem)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    // Use 302 redirect
    res.statusCode = 302;
    res.setHeader("Location", streamData.url);
    return res.end();
  } catch (err: any) {
    console.error("Stream error:", err);
    res.statusCode = 500;
    return res.end(String(err?.message || err));
  }
}
// ...existing code...