// src/lib/soundcloudGame.ts
import axios from 'axios';
import  {getAccessToken} from './soundcloudAuth.js'; 
import type { GameMode, GameTrack, SoundCloudTrackResponse } from '../src/types/types.ts';

const SC_API_BASE = 'https://api.soundcloud.com';

// Pomocnicza funkcja do mapowania surowej odpowiedzi na nasz czysty typ GameTrack
const mapToGameTrack = (track: SoundCloudTrackResponse): GameTrack => ({
  id: track.id,
  urn: track.urn,
  title: track.title,
  artist: track.user.username,
  artworkUrl: track.artwork_url?.replace('-large', '-t500x500') || null, // Pobieramy wyższą jakość okładki
  permalinkUrl: track.permalink_url,
  duration: track.duration,
});

export async function fetchGameTracks(
  mode: GameMode, 
  query: string
): Promise<GameTrack[]> {
  
  if (!query) throw new Error("Query is required");

  const accessToken = await getAccessToken();
  const headers = { 'Authorization': `OAuth ${accessToken}` };
  
  let tracks: SoundCloudTrackResponse[] = [];

  try {
    switch (mode) {
      case 'playlist': {
        // KROK 1: Znajdź playlistę
        const playlistRes = await axios.get(`${SC_API_BASE}/playlists`, {
          headers,
          params: { q: query, limit: 1 }
        });

        const playlist = playlistRes.data.collection?.[0];
        if (!playlist) throw new Error(`Nie znaleziono playlisty o nazwie: "${query}"`);

        // KROK 2: Pobierz utwory z tej playlisty
        // Niektóre playlisty zwracają tylko ID utworów, więc dla pewności pobieramy pełne obiekty
        // lub używamy pola 'tracks' jeśli jest dostępne i pełne.
        // Bezpieczniej jest użyć endpointu /playlists/:id/tracks
        const tracksRes = await axios.get(`${SC_API_BASE}/playlists/${playlist.id}/tracks`, {
            headers,
            params: { access: 'playable', limit: 50, linked_partitioning: 1 }
        });
        
        tracks = tracksRes.data.collection || [];
        break;
      }

      case 'genre': {
        // SoundCloud nie ma idealnego sortowania po popularności w endpointcie /tracks dla gatunków.
        // Najlepsze przybliżenie to wyszukiwanie z tagami.
        const res = await axios.get(`${SC_API_BASE}/tracks`, {
          headers,
          params: {
            genres: query,          // np. 'rock', 'house'
            limit: 50,              // Pobieramy więcej, żeby posortować ręcznie
            access: 'playable',     // Tylko odtwarzalne
            linked_partitioning: 1
          }
        });

        let rawTracks = res.data.collection || [];
        
        // Ręczne sortowanie po playback_count (jeśli dostępne), bo API czasem zwraca losowo
        tracks = rawTracks.sort((a: any, b: any) => 
          (b.playback_count || 0) - (a.playback_count || 0)
        ).slice(0, 30); // Bierzemy top 30
        
        break;
      }

      case 'artist': {
        // KROK 1: Znajdź użytkownika (Artystę)
        const userRes = await axios.get(`${SC_API_BASE}/users`, {
          headers,
          params: { q: query, limit: 1 }
        });

        const artist = userRes.data.collection?.[0];
        if (!artist) throw new Error(`Nie znaleziono artysty: "${query}"`);

        // KROK 2: Pobierz utwory artysty
        const tracksRes = await axios.get(`${SC_API_BASE}/users/${artist.id}/tracks`, {
          headers,
          params: { 
            access: 'playable', 
            limit: 50,
            linked_partitioning: 1
          }
        });

        let artistTracks = tracksRes.data.collection || [];

        // Sortowanie po popularności (najwięcej odtworzeń)
        tracks = artistTracks.sort((a: any, b: any) => 
          (b.playback_count || 0) - (a.playback_count || 0)
        ).slice(0, 30);

        break;
      }
    }

    // Ostateczne filtrowanie i mapowanie
    const validTracks = tracks
     .filter(t => t.streamable === true || t.access === 'playable') // Podwójne sprawdzenie
     .map(mapToGameTrack);

    if (validTracks.length === 0) {
      throw new Error("Znaleziono wyniki, ale żaden nie jest dostępny do odtwarzania (streamable: false).");
    }

    return validTracks;

  } catch (error: any) {
    console.error("Błąd w fetchGameTracks:", error.message);
    throw new Error(error.response?.data?.message || error.message || "Błąd pobierania danych z SoundCloud");
  }
}