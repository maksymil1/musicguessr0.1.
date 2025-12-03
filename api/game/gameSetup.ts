import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchGameTracks } from '../../lib/soundCloudGame.js';
import { GameMode } from '../../src/types/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { mode, query } = req.query;

  if (!mode ||!query) {
    return res.status(400).json({ error: "Brak parametrów 'mode' lub 'query'." });
  }

  // Walidacja typu GameMode
  if (!['playlist', 'genre', 'artist'].includes(mode as string)) {
    return res.status(400).json({ error: "Nieprawidłowy tryb gry." });
  }

  try {
    const tracks = await fetchGameTracks(mode as GameMode, query as string);
    res.status(200).json(tracks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}