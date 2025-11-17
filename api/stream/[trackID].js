// // Plik: api/stream/[trackId].js
import axios from 'axios';
import { getAccessToken } from '../../lib/soundcloudAuth.js'; 

export default async function handler(req, res) {
  const { trackID } = req.query;

  if (!trackID) {
    return res.status(400).json({ error: 'Brak ID utworu.' });
  }

  try {
    const accessToken = await getAccessToken();

    //KROK 1: Pobierz obiekt strumieni 
    const streamsApiUrl = `https://api.soundcloud.com/tracks/${trackID}/streams`;
    const headers = {
      'Authorization': `OAuth ${accessToken}`,
      'Accept': 'application/json'
    };

    const streamsResponse = await axios.get(streamsApiUrl, { headers });
    
    // Wyodrębnij chroniony link HLS
    const protectedHlsUrl = streamsResponse.data.hls_aac_160_url; // 

    if (!protectedHlsUrl) {
      return res.status(404).json({ error: 'Ten utwór nie jest dostępny do strumieniowania (brak HLS).' });
    }

    //KROK 2: Wykonaj drugie żądanie do chronionego linku HLS, aby uzyskać przekierowanie
    // Musimy złapać błąd, ponieważ axios traktuje przekierowania 301/302 
    // jako błędy, gdy ustawimy `maxRedirects: 0`.
    try {
      await axios.get(protectedHlsUrl, {
        headers: { 'Authorization': `OAuth ${accessToken}` },
        maxRedirects: 0 // Kluczowe: Nie podążaj automatycznie za przekierowaniem!
      });
      
      // Jeśli tu dotrzemy, to znaczy, że *nie* było przekierowania, co jest błędem
      throw new Error("Nie otrzymano oczekiwanego przekierowania 302 z SoundCloud.");

    } catch (error) {
      // Sprawdzamy, czy błąd jest oczekiwanym przekierowaniem 302 
      if (error.response && error.response.status === 302) {
        
        //! Zwróć końcowy URL z CDN do klienta 
        const finalCdnUrl = error.response.headers['location'];
        res.status(200).json({ streamUrl: finalCdnUrl });
        
      } else {
        // Jeśli to był inny błąd (np. 401, 500), rzuć go dalej
        throw error;
      }
    }

  } catch (error) {
    // Obsługa błędów z pierwszego lub drugiego żądania
    const status = error.response?.status || 500;
    const message = error.response?.data?.error_message || error.message;
    console.error(`Błąd w proxy /api/stream/${trackID}:`, status, message);
    res.status(status).json({ error: message || 'Wewnętrzny błąd serwera proxy.' });
  }
}