import type { VercelRequest, VercelResponse } from '@vercel/node';
// Usunięto rozszerzenie .ts - Vercel sam dopasuje odpowiedni plik po kompilacji
import { fetchGameTracks } from '../../lib/soundCloud/soundCloudGame'; 
import { GameMode } from '../../src/types/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS - Dodajemy nagłówki, aby uniknąć problemów z blokowaniem zapytań
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { mode, query } = req.query;

  if (!mode || !query) {
    return res.status(400).json({ error: "Brak parametrów mode/query" });
  }

  try {
    console.log(`[API] Próba pobrania utworów: Mode=${mode}, Query=${query}`);
    
    // Ustawienie timeoutu dla samej logiki (opcjonalnie)
    const tracks = await fetchGameTracks(mode as GameMode, query as string);

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: "Nie znaleziono utworów dla podanych kryteriów" });
    }

    return res.status(200).json(tracks);

  } catch (error: any) {
    // Bardziej szczegółowe logowanie błędu dla panelu Vercel
    console.error("[API FATAL ERROR]:", {
      message: error.message,
      stack: error.stack,
      mode,
      query
    });

    return res.status(500).json({ 
      error: "Błąd serwera podczas pobierania muzyki",
      details: error.message 
    });
  }
}