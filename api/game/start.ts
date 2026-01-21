import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchGameTracks } from '../../lib/soundCloud/soundCloudGame.js';
import { GameMode } from '../../src/types/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { mode, query } = req.query;

  // Podstawowa walidacja
  if (!mode || !query) {
    return res.status(400).json({ error: "Brak wymaganych parametrów: mode i query" });
  }

  console.log(`[API Start] Rozpoczynanie gry. Tryb: ${mode}, Query: ${query}`);

  try {
    // 1. Pobieramy utwory (Funkcja sama zdecyduje czy pytać iTunes czy SoundCloud)
    //    fetchGameTracks zwraca teraz ujednolicony typ GameTrack[]
    const allTracks = await fetchGameTracks(mode as GameMode, query as string);

    // 2. Walidacja ilości (zmniejszyłem próg do 5, żeby gra startowała częściej)
    if (!allTracks || allTracks.length < 5) {
      return res.status(400).json({ 
        error: `Za mało utworów, aby zacząć grę. Znaleziono: ${allTracks?.length || 0}. Wymagane minimum: 5.` 
      });
    }

    // 3. Algorytm losujący (Fisher-Yates Shuffle) - miesza tablicę
    const shuffled = [...allTracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 4. Wybieramy utwory do rundy (maksymalnie 10, lub tyle ile znaleziono)
    //    Jeśli znaleziono 7 utworów, gra będzie miała 7 rund.
    const roundLimit = Math.min(shuffled.length, 10);
    const gameRound = shuffled.slice(0, roundLimit);

    console.log(`[API Start] Gra utworzona. Liczba rund: ${gameRound.length}`);

    // Zwracamy gotową listę do frontend'u
    res.status(200).json(gameRound);

  } catch (error: any) {
    console.error("[API Start Error]:", error);
    // Zwracamy czysty komunikat błędu z naszej funkcji fetchGameTracks
    res.status(500).json({ error: error.message || "Wystąpił błąd serwera podczas tworzenia gry." });
  }
}