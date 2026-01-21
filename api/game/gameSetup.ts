import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchGameTracks } from '../../lib/soundCloud/soundCloudGame.js';
import { GameMode } from '../../src/types/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { mode, query } = req.query;

  if (!mode || !query) {
    return res.status(400).json({ error: "Brak parametrów 'mode' lub 'query'." });
  }

  // Walidacja typu GameMode (obsługujemy playlist, genre, artist)
  if (!['playlist', 'genre', 'artist'].includes(mode as string)) {
    return res.status(400).json({ error: `Nieprawidłowy tryb gry: ${mode}` });
  }

  try {
    console.log(`[API Setup] Pobieranie utworów dla: ${mode} / ${query}`);
    
    // Pobieramy wszystko co znalazła funkcja (bez losowania rund)
    const tracks = await fetchGameTracks(mode as GameMode, query as string);
    
    console.log(`[API Setup] Zwracam ${tracks.length} utworów.`);
    
    res.status(200).json(tracks);
  } catch (error: any) {
    console.error("[API Setup Error]:", error);
    res.status(500).json({ error: error.message || "Błąd podczas pobierania konfiguracji gry." });
  }
}