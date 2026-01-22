import type { VercelRequest, VercelResponse } from '@vercel/node';
// Upewnij się, że ścieżka do musicSource jest poprawna względem folderu api/
import { fetchGameTracks } from '../../lib/soundCloud/soundCloudGame.ts'; 
import { GameMode } from '../../src/types/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { mode, query } = req.query;

  if (!mode || !query) {
    return res.status(400).json({ error: "Brak parametrów mode/query" });
  }

  try {
    console.log(`[API] Start gry: Mode=${mode}, Query=${query}`);
    
    // Teraz ta funkcja obsługuje iTunes (dla artist/genre) i SoundCloud (dla playlist)
    const tracks = await fetchGameTracks(mode as GameMode, query as string);

    res.status(200).json(tracks);

  } catch (error: any) {
    console.error("[API] Error:", error.message);
    res.status(500).json({ error: error.message || "Błąd serwera" });
  }
}