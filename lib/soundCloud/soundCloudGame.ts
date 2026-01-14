// src/lib/soundcloudGame.ts
import axios from 'axios';
import  {getAccessToken} from './soundCloudAuth.js'; 
import type { GameMode, GameTrack, SoundCloudTrackResponse } from '../../src/types/types.ts';


const SC_API_BASE = 'https://api.soundcloud.com';

// Pomocnicza funkcja do mapowania surowej odpowiedzi na nasz czysty typ GameTrack
const mapToGameTrack = (track: SoundCloudTrackResponse): GameTrack => ({
  urn: track.urn || `soundcloud:tracks:${track.id}`,
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
        let playlistUrn: string | null = null;

        // SCENARIUSZ A: Użytkownik wkleił link (np. https://soundcloud.com/...)
        if (query.startsWith('http')) {
          try {
            const resolveRes = await axios.get(`${SC_API_BASE}/resolve`, {
              headers,
              params: { url: query }
            });
            console.log("Resolve response data:", resolveRes.data.kind);

            if (resolveRes.data && resolveRes.data.kind === 'playlist') {
              playlistUrn = resolveRes.data.urn; 
              //   if (resolveRes.data.tracks && Array.isArray(resolveRes.data.tracks)) {
              //   console.log(`Pobrano ${resolveRes.data.tracks.length} utworów bezpośrednio z resolve.`);
              //   tracks = resolveRes.data.tracks;
              // }
            } else {
              throw new Error("Podany link nie prowadzi do playlisty.");
            }
          } catch (e) {
            console.error("Błąd resolve:", e);
            throw new Error("Nie udało się przetworzyć linku. Sprawdź czy playlista jest publiczna.");
          }
        }
        // SCENARIUSZ B: Użytkownik podał URN (np. soundcloud:playlists:12345)
        else if (query.startsWith('soundcloud:playlists:')) {
          playlistUrn = query.replace('soundcloud:playlists:', '');
        } else {
          playlistUrn = query;
        }


        console.log("Zidentyfikowany URN playlisty:", playlistUrn);


        if(playlistUrn)
        {
          console.log(`Pobieranie utworów dla Playlist ID: ${playlistUrn} z limitem 500...`);
  
          try {
            // Używamy endpointu /tracks, który pozwala na duży limit
            // linked_partitioning=1 zmienia strukturę odpowiedzi na { collection: [], next_href: ... }
            const tracksRes = await axios.get(`${SC_API_BASE}/playlists/${playlistUrn}/tracks`, {
              headers,
              params: { 
                limit: 500, // SoundCloud zazwyczaj pozwala max na 200 lub 500 w jednym rzucie
                access: 'playable',
                linked_partitioning: 1 
              }
            });

            // Obsługa paginowanej odpowiedzi
            if (tracksRes.data.collection) {
              tracks = tracksRes.data.collection;
            } else if (Array.isArray(tracksRes.data)) {
              tracks = tracksRes.data;
            }

            console.log(`Pobrano ${tracks.length} utworów.`);

          } catch (err: any) {
            console.error("Błąd pobierania listy utworów:", err.message);
          }

        }
        break;
      }

      case 'genre': {
        console.log("Sprawdzam URN:", query);
        const res = await axios.get(`${SC_API_BASE}/playlists/${query}/tracks`, {
          headers,
        });


        tracks = res.data || [];
        break;
      }

      case 'artist': {
        console.log(`\n[Artist] Szukam profilu: "${query}"`);
        let artist: any = null;
        let artistTracks: SoundCloudTrackResponse[] = [];

        // --- KROK 1: Wyszukiwanie użytkownika (Naprawione parsowanie) ---
        try {
            const userRes = await axios.get(`${SC_API_BASE}/users`, {
              headers,
              params: { q: query, limit: 2 }
            });

            const foundUsers = Array.isArray(userRes.data) 
                ? userRes.data 
                : (userRes.data.collection || []);

            if (foundUsers.length > 0) {
                // Szukamy najlepszego kandydata (najwięcej followersów + ma utwory)
                const bestMatch = foundUsers
                    .filter((u: any) => (u.track_count || 0) > 0)
                    .sort((a: any, b: any) => (b.followers_count || 0) - (a.followers_count || 0))[0];
                
                if (bestMatch) {
                    artist = bestMatch;
                    console.log(`[Artist] Znaleziono przez User Search: ${artist.username} (${artist.followers_count} obs.)`);
                  }
            }
        } catch (e: any) {
            console.warn("[Artist] Błąd przy szukaniu użytkownika:", e.message);
        }
        if (artist) {
            console.log(`[Artist] Pobieranie oficjalnej biblioteki ID: ${artist.id}...`);
            try {
                const tracksRes = await axios.get(`${SC_API_BASE}/users/${artist.id}/tracks`, {
                    headers,
                    params: { 
                        limit: 200, 
                        linked_partitioning: 1,
                    }
                });
                artistTracks = tracksRes.data.collection || [];
            } catch (e) {
                console.warn("[Artist] Błąd pobierania oficjalnych utworów:", e);
            }
        }

            let validArtistTracks = artistTracks.filter(t => {
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
        });

        console.log(`[Artist] Oficjalne utwory po filtracji (w tym snippety): ${validArtistTracks.length}`);
          
          if (validArtistTracks.length === 0) {
            console.log(` [Artist] Brak dostępnych utworów na oficjalnym koncie. Szukam w wyszukiwarce ogólnej...`);

          try {
            const searchRes = await axios.get(`${SC_API_BASE}/tracks`, {
                headers,
                params: {
                    q: query,
                    limit: 100,
                    access: 'playable', 
                }
            });

            const searchResults = Array.isArray(searchRes.data) 
                ? searchRes.data 
                : (searchRes.data.collection || [])
            
            // Proste dopasowanie nazwy, żeby nie brać śmieci
            const queryLower = query.toLowerCase();
            validArtistTracks = searchResults.filter((t: any) => {
                const titleMatch = t.title.toLowerCase().includes(queryLower);
                const userMatch = t.user.username.toLowerCase().includes(queryLower);
                return titleMatch || userMatch;
            });
            
            console.log(`[Artist] Znaleziono ${validArtistTracks.length} utworów w wyszukiwaniu ogólnym.`);
        } catch (fallbackError: any) {
                console.error("[Artist] Błąd w fallbacku:", fallbackError.message);
            }

        if (validArtistTracks.length === 0) {
          throw new Error(`Nie znaleziono żadnych utworów dla "${query}".`);
        }
      }


        console.log(`[Artist] Wybrano ostatecznie: ${artist.username} (ID: ${artist.id}). Pobieranie biblioteki...`);

        validArtistTracks.sort((a: any, b: any) => 
          (b.playback_count || 0) - (a.playback_count || 0)
        );

        // Debug: Oznaczamy w logach, które to snippety (mają 30000ms)
        const top3 = validArtistTracks.slice(0, 3).map((t:any) => 
            `${t.title} [${t.duration === 30000 ? 'SNIPPET 30s' : 'FULL'}]`
        );
        console.log("[Artist] Top 3 hity w grze:", top3);

        // Bierzemy Top 40 do losowania
        tracks = validArtistTracks.slice(0, 10);
        break;
      }

    }


const validTracks = tracks.filter(t => {
        if (!t) return false;

        const hasId = t.id || t.urn;
        const isStreamable = t.streamable !== false; // jesli undefined lub true, to OK
        const policy = t.policy || 'ALLOW';  // jesli nie ma policy, to ALLOW
        const isBlocked = policy === 'BLOCK';
        let hasMediaCheck = true;
        if (t.media) // jesli ma media to sprawdzamy transcodings
        {
             // Jeśli pole media istnieje, to musi mieć transcodings > 0
             hasMediaCheck = (t.media.transcodings?.length || 0) > 0;
        }

        return hasId && isStreamable && !isBlocked && hasMediaCheck;
    }).map(mapToGameTrack);

    if (validTracks.length < 5) {
      console.warn("Przefiltrowano zbyt wiele utworów. Debug:");
      if (tracks.length > 0) {
          console.log("Przykładowy odrzucony (lub pierwszy z listy):", JSON.stringify(tracks[0], null, 2));
      }
      throw new Error(`Znaleziono za mało grywalnych utworów (${validTracks.length}) po filtracji.`);
    }

    console.log(`Zwracam ${validTracks.length} utworów do gry.`);
    return validTracks;

  } catch (error: any) {
    console.error("Błąd w fetchGameTracks:", error.message);
    throw new Error(error.response?.data?.message || error.message || "Błąd pobierania danych z SoundCloud");
  }
}