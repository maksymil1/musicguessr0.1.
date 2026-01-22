import type { VercelRequest, VercelResponse } from '@vercel/node';
// Ensure the path to musicSource is correct relative to the api/ folder
import { fetchGameTracks } from '../../lib/soundCloud/soundCloudGame.ts'; 
import { GameMode } from '../../src/types/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { mode, query } = req.query;

  if (!mode || !query) {
    return res.status(400).json({ error: "Missing mode or query parameters" });
  }

  try {
    console.log(`[API] Game Start: Mode=${mode}, Query=${query}`);
    
    // This function now handles iTunes (for artist/genre) and SoundCloud (for playlists)
    const tracks = await fetchGameTracks(mode as GameMode, query as string);

    res.status(200).json(tracks);

  } catch (error: any) {
    console.error("[API] Error:", error.message);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}