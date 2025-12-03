import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
// Poprawny import z src/lib (bez .js na końcu, TS sam rozwiąże)
import { getAccessToken } from '../../lib/soundcloudAuth.js' 

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { trackID } = req.query;

  if (!trackID) return res.status(400).json({ error: 'Brak ID utworu.' });

  try {
    const accessToken = await getAccessToken();

    // 1. Pobierz dostępne formaty strumieni
    const streamsApiUrl = `https://api.soundcloud.com/tracks/${trackID}/streams`;
    const headers = { 'Authorization': `OAuth ${accessToken}` };
    
    // Pobieramy listę linków (to jeszcze nie są pliki audio, tylko linki do linków)
    const streamsResponse = await axios.get(streamsApiUrl, { headers });
    const data = streamsResponse.data;

    // 2. Szukamy najlepszego formatu w kolejności priorytetu
    // HLS jest preferowany (szybsze ładowanie), potem MP3 (Progressive), na końcu Preview (jeśli utwór płatny)
    let targetUrl = 
      data.hls_aac_160_url || 
      data.hls_mp3_128_url || 
      data.http_mp3_128_url || // Progressive MP3
      data.preview_mp3_128_url; // Snippet 30s (lepsze to niż błąd)

    if (!targetUrl) {
      console.warn(`[Stream] Brak obsługiwanych formatów dla ${trackID}. Dostępne klucze:`, Object.keys(data));
      return res.status(404).json({ error: 'Utwór niedostępny do odtwarzania (Geo-block lub GO+).' });
    }

    // 3. Wykonujemy 'hop' żeby dostać finalny link CDN
    // SoundCloud wymaga zapytania pod ten URL z tokenem, żeby dostać przekierowanie 302 lub JSON z polem 'url'
    try {
      const finalLinkResponse = await axios.get(targetUrl, {
        headers: { 'Authorization': `OAuth ${accessToken}` },
        maxRedirects: 0, // Nie podążaj automatycznie, chcemy złapać nagłówek Location
        validateStatus: (status) => status >= 200 && status < 400
      });

      // Niektóre endpointy zwracają JSON { "url": "..." }, inne robią redirect 302
      let finalCdnUrl = '';

      if (finalLinkResponse.data && finalLinkResponse.data.url) {
        finalCdnUrl = finalLinkResponse.data.url;
      } else if (finalLinkResponse.headers.location) {
        finalCdnUrl = finalLinkResponse.headers.location;
      } else {
        throw new Error("Nie udało się wydobyć finalnego URL z odpowiedzi SC.");
      }

      // Zwracamy link do frontendu
      return res.status(200).json({ streamUrl: finalCdnUrl });

    } catch (redirectError: any) {
      // Axios rzuca błąd przy 302 jeśli maxRedirects=0, łapiemy to tutaj
      if (redirectError.response && redirectError.response.status === 302) {
        const finalCdnUrl = redirectError.response.headers.location;
        return res.status(200).json({ streamUrl: finalCdnUrl });
      }
      throw redirectError;
    }

  } catch (error: any) {
    console.error(`[Stream Error ${trackID}]:`, error.response?.data || error.message);
    // Jeśli 404/401 z SoundCloud, przekaż to do frontendu
    const status = error.response?.status || 500;
    return res.status(status).json({ error: 'Błąd pobierania strumienia' });
  }
}


















// import type { VercelRequest, VercelResponse } from '@vercel/node';
// import axios from 'axios';
// import { getAccessToken } from '../../lib/soundcloudAuth.js'; 

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   const { trackID } = req.query;

//   if (!trackID) {
//     return res.status(400).json({ error: 'Brak ID utworu.' });
//   }

//   try {
//     const accessToken = await getAccessToken();

//     //KROK 1: Pobierz obiekt strumieni 
//     const streamsApiUrl = `https://api.soundcloud.com/tracks/${trackID}/streams`;
//     const headers = {
//       'Authorization': `OAuth ${accessToken}`,
//       'Accept': 'application/json'
//     };

//     const streamsResponse = await axios.get(streamsApiUrl, { headers });
    
//     // Wyodrębnij chroniony link HLS
//     const protectedHlsUrl = streamsResponse.data.hls_aac_160_url || streamsResponse.data.hls_aac_96_url || streamsResponse.data.hls_aac_128_url ; // 

//     if (!protectedHlsUrl) {
//       console.warn(`Brak HLS dla utworu ${trackID}. Dostępne:`, Object.keys(streamsResponse.data));
//       return res.status(404).json({ error: 'Ten utwór nie jest dostępny do strumieniowania (brak HLS).' });
//     }

//     //KROK 2: Wykonaj drugie żądanie do chronionego linku HLS, aby uzyskać przekierowanie
//     // Musimy złapać błąd, ponieważ axios traktuje przekierowania 301/302 
//     // jako błędy, gdy ustawimy `maxRedirects: 0`.
//     try {
//       await axios.get(protectedHlsUrl, {
//         headers: { 'Authorization': `OAuth ${accessToken}` },
//         maxRedirects: 0,
//         validateStatus: (status) => status >= 200 && status < 400 // Akceptuj 302 jako sukces
//       });
      
//       // Jeśli tu dotrzemy, to znaczy, że *nie* było przekierowania, co jest błędem
//       throw new Error("Nie otrzymano oczekiwanego przekierowania 302 z SoundCloud.");

//       } catch (redirectError: any) {
//       // Szukamy nagłówka location w odpowiedzi 302
//       if (redirectError.response?.status === 302) {
//         const finalCdnUrl = redirectError.response.headers['location'];
//         return res.status(200).json({ streamUrl: finalCdnUrl });
//       }
//       throw redirectError; // Inny błąd? Rzuć dalej.
//     }
// } catch (error: any) {
//     // Logowanie błędu
//     const status = error.response?.status || 500;
//     console.error(`Stream Error:`, error.message);
    
//     // Jeśli SoundCloud zwrócił 404, to znaczy, że utwór jest zablokowany/prywatny
//     if (status === 404) {
//       return res.status(404).json({ error: 'Utwór zablokowany lub nie istnieje.' });
//     }
    
//     res.status(status).json({ error: 'Błąd serwera proxy.' });
//   }
// }









// // // // Plik: api/stream/[trackId].js
// // import axios from 'axios';
// // import { getAccessToken } from '../../lib/soundcloudAuth.js'; 

// // export default async function handler(req, res) {
// //   const { trackID } = req.query;

// //   if (!trackID) {
// //     return res.status(400).json({ error: 'Brak ID utworu.' });
// //   }

// //   try {
// //     const accessToken = await getAccessToken();

// //     //KROK 1: Pobierz obiekt strumieni 
// //     const streamsApiUrl = `https://api.soundcloud.com/tracks/${trackID}/streams`;
// //     const headers = {
// //       'Authorization': `OAuth ${accessToken}`,
// //       'Accept': 'application/json'
// //     };

// //     const streamsResponse = await axios.get(streamsApiUrl, { headers });
    
// //     // Wyodrębnij chroniony link HLS
// //     const protectedHlsUrl = streamsResponse.data.hls_aac_160_url; // 

// //     if (!protectedHlsUrl) {
// //       return res.status(404).json({ error: 'Ten utwór nie jest dostępny do strumieniowania (brak HLS).' });
// //     }

// //     //KROK 2: Wykonaj drugie żądanie do chronionego linku HLS, aby uzyskać przekierowanie
// //     // Musimy złapać błąd, ponieważ axios traktuje przekierowania 301/302 
// //     // jako błędy, gdy ustawimy `maxRedirects: 0`.
// //     try {
// //       await axios.get(protectedHlsUrl, {
// //         headers: { 'Authorization': `OAuth ${accessToken}` },
// //         maxRedirects: 0 // Kluczowe: Nie podążaj automatycznie za przekierowaniem!
// //       });
      
// //       // Jeśli tu dotrzemy, to znaczy, że *nie* było przekierowania, co jest błędem
// //       throw new Error("Nie otrzymano oczekiwanego przekierowania 302 z SoundCloud.");

// //     } catch (error) {
// //       // Sprawdzamy, czy błąd jest oczekiwanym przekierowaniem 302 
// //       if (error.response && error.response.status === 302) {
        
// //         //! Zwróć końcowy URL z CDN do klienta 
// //         const finalCdnUrl = error.response.headers['location'];
// //         res.status(200).json({ streamUrl: finalCdnUrl });
        
// //       } else {
// //         // Jeśli to był inny błąd (np. 401, 500), rzuć go dalej
// //         throw error;
// //       }
// //     }

// //   } catch (error) {
// //     // Obsługa błędów z pierwszego lub drugiego żądania
// //     const status = error.response?.status || 500;
// //     const message = error.response?.data?.error_message || error.message;
// //     console.error(`Błąd w proxy /api/stream/${trackID}:`, status, message);
// //     res.status(status).json({ error: message || 'Wewnętrzny błąd serwera proxy.' });
// //   }
// // }