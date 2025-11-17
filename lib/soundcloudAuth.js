import axios from 'axios';
import querystring from 'querystring';

// Zmienne bufora na poziomie modułu
let cachedToken = null;
let tokenExpiryTime = null;

const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;

// Funkcja do pobrania nowego tokena
async function fetchNewToken() {
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenUrl = 'https://secure.soundcloud.com/oauth/token';
    const data = { grant_type: 'client_credentials' };
    
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    };

    const response = await axios.post(tokenUrl, querystring.stringify(data), { headers });

    // Ustawienie czasu wygaśnięcia z 60-sekundowym buforem bezpieczeństwa
    tokenExpiryTime = Date.now() + (response.data.expires_in - 60) * 1000;
    cachedToken = response.data.access_token;
    
    console.log("Pobrano nowy token SoundCloud.");
    return cachedToken;

  } catch (error) {
    console.error("Krytyczny błąd podczas pobierania tokena SoundCloud:", error.response?.data || error.message);
    throw new Error("Nie można uwierzytelnić się z SoundCloud API.");
  }
}

// Główna eksportowana funkcja, której będą używać inne trasy API
export async function getAccessToken() {
  // Sprawdź, czy token istnieje i czy nie wygasł
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  // Jeśli nie, pobierz nowy
  return await fetchNewToken();
}