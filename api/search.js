// // Plik: api/search.js
import axios from 'axios';
import { getAccessToken } from '../lib/soundcloudAuth.js';

export default async function handler(req, res) {
  const { query } = req.query; // Pobierz termin wyszukiwania z frontendu

  if (!query) {
    return res.status(400).json({ error: 'Brak terminu wyszukiwania.' });
  }

  try {
    const accessToken = await getAccessToken();
    
    // Użyj `axios` lub `fetch` do wykonania żądania do API SoundCloud
    const apiUrl = `https://api.soundcloud.com/playlists`; // Lub /tracks
    
    const response = await axios.get(apiUrl, {
      params: {
        q: query,
        limit: 10 // Przykładowy parametr
      },
      headers: {
        'Authorization': `OAuth ${accessToken}` // Kluczowa zmiana! [9]
      }
    });

    // Zwróć dane JSON bezpośrednio do klienta
    res.status(200).json(response.data);

  } catch (error) {
    console.error("Błąd w proxy /api/search:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Nie udało się wyszukać playlist.' });
  }
}






























// import axios from 'axios';

// // Funkcja pomocnicza do pobierania tokena (możemy ją później przenieść do wspólnego pliku)
// const getAccessToken = async () => {
//     const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
//     const SOUNDCLOUD_CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET;

//     const params = new URLSearchParams();
//     params.append('grant_type', 'client_credentials');
//     params.append('client_id', SOUNDCLOUD_CLIENT_ID);
//     params.append('client_secret', SOUNDCLOUD_CLIENT_SECRET);

//     const response = await axios.post(
//         'https://api.soundcloud.com/oauth2/token',
//         params
//     );
//     return response.data.access_token;
// };

// export default async function handler(req, res) {
//     // 1. Pobieramy parametr wyszukiwania 'q' (np. 'lofi')
//     const { q } = req.query;
//     if (!q) {
//         return res.status(400).json({ error: 'Brak parametru wyszukiwania (q)' });
//     }

//     try {
//         // 2. Zdobywamy token
//         const accessToken = await getAccessToken();

//         // 3. Wyszukujemy playlisty (użyjemy /playlists, bo ten endpoint daje strukturę, której oczekuje Twój QuizPlayer)
//         const searchResponse = await axios.get(
//             `https://api.soundcloud.com/playlists?q=${encodeURIComponent(q)}`,
//             {
//                 headers: {
//                     'Authorization': `OAuth ${accessToken}`,
//                 }
//             }
//         );

//         // 4. Przekazujemy wynik wyszukiwania bezpośrednio do front-endu
//         res.status(200).json(searchResponse.data);

//     } catch (error) {
//         console.error('Błąd w /api/search:', error.message);
//         // Zwracamy błąd 500
//         res.status(500).json({ error: 'Błąd podczas wyszukiwania w SoundCloud API' });
//     }
// }