import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { getAccessToken } from '../../lib/soundCloud/soundCloudAuth.js'; 

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { trackUrn } = req.query;

  if (!trackUrn) return res.status(400).json({ error: 'Brak trackUrn.' });

  try {
    const accessToken = await getAccessToken();
    const decodedUrn = decodeURIComponent(trackUrn as string);

    // --- STRATEGIA BEZPIECZNA ---
    // Dokumentacja mówi o URN, ale Axios/Vercel mogą psuć URL przez kodowanie dwukropków (%3A).
    // SoundCloud API w endpointach /tracks/{id}/... akceptuje czyste ID.
    // Wyciągamy ostatnią część po dwukropku, jeśli to URN, lub bierzemy całość, jeśli to ID.
    
    // Przykłady wejściowe:
    // "soundcloud:tracks:339401386" -> "339401386"
    // "339401386" -> "339401386"
    const safeId = decodedUrn.split(':').pop(); 

    // Walidacja: Upewnijmy się, że safeId to ciąg znaków, który wygląda jak ID (cyfry)
    if (!safeId || !/^\d+$/.test(safeId)) {
        console.warn(`[Stream] Nietypowy format ID: ${safeId} (z ${decodedUrn})`);
        // Jeśli to nie są same cyfry, próbujemy użyć oryginału (fallback dla dziwnych URNów)
    }

    console.log(`[Stream] Request ID: ${safeId}`);

    const streamsApiUrl = `https://api.soundcloud.com/tracks/${safeId}/streams`;
    
    const streamsResponse = await axios.get(streamsApiUrl, { 
        headers: { 'Authorization': `OAuth ${accessToken}` } 
    });
    
    const data = streamsResponse.data;

    // Pobieramy najlepszy format
    let targetUrl = 
      data.hls_aac_160_url || 
      data.hls_mp3_128_url || 
      data.http_mp3_128_url || 
      data.preview_mp3_128_url;

    if (!targetUrl) {
      // Specjalna obsługa błędów, żeby frontend wiedział co robić
      return res.status(404).json({ error: 'Utwór niedostępny (Geo-block/GO+).' });
    }

    // Pobranie finalnego linku (bez redirectu)
    const finalLinkResponse = await axios.get(targetUrl, {
        headers: { 'Authorization': `OAuth ${accessToken}` },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
    });

    let finalCdnUrl = finalLinkResponse.data?.url || finalLinkResponse.headers.location;
    
    if (!finalCdnUrl) throw new Error("Brak linku CDN.");

    return res.status(200).json({ streamUrl: finalCdnUrl });

  } catch (error: any) {
    const status = error.response?.status || 500;
    const msg = error.response?.data?.message || error.message;
    console.error(`[Stream Error] Status: ${status}, Msg: ${msg}`);

    if (status === 404) return res.status(404).json({ error: "Nie znaleziono utworu." });
    if (status === 403) return res.status(403).json({ error: "Brak dostępu." });
    
    return res.status(status).json({ error: 'Błąd serwera.' });
  }
}




































// import type { VercelRequest, VercelResponse } from '@vercel/node';
// import axios from 'axios';
// import { getAccessToken } from '../../lib/soundCloud/soundCloudAuth.js'; 

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   const { trackUrn } = req.query;

//   if (!trackUrn) return res.status(400).json({ error: 'nieprawidłowe urn utworu.' });

//   try {
//     const decodedUrn = decodeURIComponent(trackUrn as string);

//     if (!/^\d+$/.test(decodedUrn) &&!decodedUrn.startsWith('soundcloud:tracks:')) {
//        console.warn(` Podejrzany format ID: ${decodedUrn}`);
//     }
//     const accessToken = await getAccessToken();

//     console.log(`[Stream] Pobieranie strumienia dla ${decodedUrn}`);

//     // 1. Pobierz dostępne formaty strumieni
//     const streamsApiUrl = `https://api.soundcloud.com/tracks/${decodedUrn}/streams`;
//     const headers = { 'Authorization': `OAuth ${accessToken}` };
    
//     // Pobieramy listę linków (to jeszcze nie są pliki audio, tylko linki do linków)
//     const streamsResponse = await axios.get(streamsApiUrl, { headers });
//     const data = streamsResponse.data;


//     console.log(`[Stream] Dostępne formaty dla ${decodedUrn}:`, Object.keys(data));
    
    
//     // 2. Szukamy najlepszego formatu w kolejności priorytetu
//     // HLS jest preferowany (szybsze ładowanie), potem MP3 (Progressive), na końcu Preview (jeśli utwór płatny)
//     let targetUrl = 
//       data.hls_aac_160_url || 
//       data.hls_mp3_128_url || 
//       data.http_mp3_128_url || // Progressive MP3
//       data.preview_mp3_128_url; // Snippet 30s (lepsze to niż błąd)

//     if (!targetUrl) {
//       console.warn(`[Stream] Brak obsługiwanych formatów dla ${decodedUrn}. Dostępne klucze:`, Object.keys(data));
//       return res.status(404).json({ error: 'Utwór niedostępny do odtwarzania (Geo-block lub GO+).' });
//     }

//     // 3. Wykonujemy 'hop' żeby dostać finalny link CDN
//     // SoundCloud wymaga zapytania pod ten URL z tokenem, żeby dostać przekierowanie 302 lub JSON z polem 'url'
//     try {
//       const finalLinkResponse = await axios.get(targetUrl, {
//         headers: { 'Authorization': `OAuth ${accessToken}` },
//         maxRedirects: 0, // Nie podążaj automatycznie, chcemy złapać nagłówek Location
//         validateStatus: (status) => status >= 200 && status < 400
//       });

//       // Niektóre endpointy zwracają JSON { "url": "..." }, inne robią redirect 302
//       let finalCdnUrl = '';

//       if (finalLinkResponse.data && finalLinkResponse.data.url) {
//         finalCdnUrl = finalLinkResponse.data.url;
//       } else if (finalLinkResponse.headers.location) {
//         finalCdnUrl = finalLinkResponse.headers.location;
//       } else {
//         throw new Error("Nie udało się wydobyć finalnego URL z odpowiedzi SC.");
//       }

//       // Zwracamy link do frontendu
//       return res.status(200).json({ streamUrl: finalCdnUrl });

//     } catch (redirectError: any) {
//       // Axios rzuca błąd przy 302 jeśli maxRedirects=0, łapiemy to tutaj
//       if (redirectError.response && redirectError.response.status === 302) {
//         const finalCdnUrl = redirectError.response.headers.location;
//         return res.status(200).json({ streamUrl: finalCdnUrl });
//       }
//       throw redirectError;
//     }

//   } catch (error: any) {
//     console.error(`[Stream Error ${trackUrn}]:`, error.response?.data || error.message);
//     // Jeśli 404/401 z SoundCloud, przekaż to do frontendu
//     const status = error.response?.status || 500;
//     return res.status(status).json({ error: 'Błąd pobierania strumienia' });
//   }
// }








