import axios from 'axios';
import { getAccessToken } from './soundCloudAuth.js'; 
import type { GameMode, GameTrack, SoundCloudTrackResponse } from '../../src/types/types.ts';

const SC_API_BASE = 'https://api.soundcloud.com';

// Pomocnicza funkcja do mapowania
const mapToGameTrack = (track: SoundCloudTrackResponse): GameTrack => ({
  urn: track.urn || `soundcloud:tracks:${track.id}`,
  title: track.title,
  artist: track.user.username,
  artworkUrl: track.artwork_url?.replace('-large', '-t500x500') || null,
  permalinkUrl: track.permalink_url,
  duration: track.duration,
  source: 'soundcloud',
});

const getItunesArtwork = (url: string) => url.replace('100x100bb', '500x500bb');

export async function fetchGameTracks(
  mode: GameMode, 
  query: string
): Promise<GameTrack[]> {
  
  if (!query) throw new Error("Query is required");

  // USUNIĘTO POBIERANIE TOKENA STĄD - BLOKOWAŁO ITUNES!
  
  let finalTracks: GameTrack[] = [];

  try {
    // --- 1. TRYB ITUNES (ARTIST / GENRE) ---
    if (mode === 'artist' || mode === 'genre') {
      let searchTerm = query;
      
      // Dopisek dla lepszych wyników w iTunes
      if (mode === 'genre') searchTerm = `${query} music top hits`;
      
      console.log(`[MusicSource] Szukam w iTunes: ${searchTerm}`);

      // iTunes nie wymaga żadnego tokena auth
      const res = await axios.get('https://itunes.apple.com/search', {
        params: {
          term: searchTerm,
          entity: 'song',
          limit: 50,
          explicit: 'No'
        }
      });

      if (!res.data.results || res.data.results.length === 0) {
        throw new Error(`Nie znaleziono utworów dla: ${query}`);
      }

      finalTracks = res.data.results.map((item: any) => ({
        urn: item.previewUrl, 
        title: item.trackName,
        artist: item.artistName,
        artworkUrl: item.artworkUrl100 ? getItunesArtwork(item.artworkUrl100) : null,
        duration: 30000,
        source: 'itunes'
      }));

      // Losowanie
      finalTracks = finalTracks.sort(() => 0.5 - Math.random()).slice(0, 20);

    } 
    // --- 2. TRYB SOUNDCLOUD (PLAYLIST) ---
    else if (mode === 'playlist') {
      
      // Token pobieramy TYLKO tutaj, gdy jest faktycznie potrzebny
      console.log("[MusicSource] Autoryzacja SoundCloud...");
      const accessToken = await getAccessToken();
      const headers = { 'Authorization': `OAuth ${accessToken}` };

      let playlistId: string | null = null;

      if (query.startsWith('http')) {
        try {
          const resolveRes = await axios.get(`${SC_API_BASE}/resolve`, {
            headers,
            params: { url: query }
          });
          if (resolveRes.data && resolveRes.data.kind === 'playlist') {
            playlistId = resolveRes.data.id; 
          } else {
            throw new Error("Link nie prowadzi do playlisty.");
          }
        } catch (e) {
          throw new Error("Błąd linku playlisty SoundCloud lub brak dostępu.");
        }
      } else if (query.startsWith('soundcloud:playlists:')) {
        playlistId = query.replace('soundcloud:playlists:', '');
      } else {
        playlistId = query;
      }

      if (playlistId) {
        console.log(`[MusicSource] Pobieranie playlisty SC ID: ${playlistId}`);
        
        const tracksRes = await axios.get(`${SC_API_BASE}/playlists/${playlistId}/tracks`, {
          headers,
          params: { limit: 200, access: 'playable', linked_partitioning: 1 }
        });

        let rawScTracks: SoundCloudTrackResponse[] = [];
        if (tracksRes.data.collection) rawScTracks = tracksRes.data.collection;
        else if (Array.isArray(tracksRes.data)) rawScTracks = tracksRes.data;

        // Filtrowanie (blokady regionalne, brak streamu itp.)
        finalTracks = rawScTracks.filter(t => {
            if (!t) return false;
            const hasId = t.id || t.urn;
            const isStreamable = t.streamable !== false;
            const policy = t.policy || 'ALLOW';
            const isBlocked = policy === 'BLOCK';
            
            let hasMediaCheck = true;
            if (t.media) {
                 hasMediaCheck = (t.media.transcodings?.length || 0) > 0;
            }
            return hasId && isStreamable && !isBlocked && hasMediaCheck;
        }).map(mapToGameTrack);
        
        finalTracks = finalTracks.sort(() => 0.5 - Math.random()).slice(0, 20);
      }
    }

    // Walidacja ilości
    if (finalTracks.length < 5) {
      throw new Error(`Znaleziono za mało grywalnych utworów (${finalTracks.length}). Wymagane min. 5.`);
    }

    console.log(`[MusicSource] Sukces. Zwracam ${finalTracks.length} utworów.`);
    return finalTracks;

  } catch (error: any) {
    console.error("Błąd w fetchGameTracks:", error.message || error);
    throw new Error(error.message || "Błąd pobierania danych z serwisu muzycznego.");
  }
}