// api/game/start.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchGameTracks } from '../../lib/soundCloud/soundCloudGame.js';
import { GameMode } from '../../src/types/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { mode, query } = req.query;

  if (!mode ||!query) {
    return res.status(400).json({ error: "Brak parametrów mode/query" });
  }

  try {
    // 1. Pobieramy pulę utworów (np. 30-50 sztuk) używając naszej funkcji z lib
    const allTracks = await fetchGameTracks(mode as GameMode, query as string);

    if (allTracks.length < 8) {
      return res.status(400).json({ 
        error: `Za mało utworów w tym gatunku/playliście, aby zacząć grę (znaleziono: ${allTracks.length}, wymagane: 8).` 
      });
    }

    // 2. Algorytm losujący (Fisher-Yates Shuffle) - miesza tablicę
    const shuffled = [...allTracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 3. Wybieramy pierwsze 8 utworów
    const gameRound = shuffled.slice(0, 8);

    res.status(200).json(gameRound);

  } catch (error: any) {
    console.error("Game start error:", error);
    res.status(500).json({ error: error.message || "Błąd serwera" });
  }
}