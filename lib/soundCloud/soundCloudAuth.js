import axios from 'axios';
import querystring from 'querystring';
import fs from 'fs';
import path from 'path';
import os from 'os';

const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;

// Ścieżka do pliku tymczasowego (działa na Vercel i lokalnie)
const TOKEN_FILE_PATH = path.join(os.tmpdir(), 'soundcloud_token_cache.json');

// 1. Inicjalizacja Globalnego Cache (RAM)
if (!global.soundCloudTokenCache) {
  global.soundCloudTokenCache = {
    token: null,
    expiry: 0,
    fetchingPromise: null
  };
}

// Pomocnicza funkcja: Odczyt z pliku
function readTokenFromFile() {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const rawData = fs.readFileSync(TOKEN_FILE_PATH, 'utf8');
      const data = JSON.parse(rawData);
      // Sprawdź czy token z pliku jest ważny
      if (data.token && Date.now() < data.expiry) {
        // Aktualizuj RAM przy okazji
        global.soundCloudTokenCache.token = data.token;
        global.soundCloudTokenCache.expiry = data.expiry;
        return data.token;
      }
    }
  } catch (e) {
    console.warn("Błąd odczytu cache plikowego:", e.message);
  }
  return null;
}

// Pomocnicza funkcja: Zapis do pliku
function writeTokenToFile(token, expiry) {
  try {
    const data = JSON.stringify({ token, expiry });
    fs.writeFileSync(TOKEN_FILE_PATH, data, 'utf8');
  } catch (e) {
    console.warn("Błąd zapisu cache plikowego:", e.message);
  }
}

async function fetchNewToken() {
  try {
    console.log("[Auth] Wysyłanie zapytania do SoundCloud API...");
    
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenUrl = 'https://secure.soundcloud.com/oauth/token';
    const data = { grant_type: 'client_credentials' };
    
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    };

    const response = await axios.post(tokenUrl, querystring.stringify(data), { headers });

    const expiresIn = response.data.expires_in; 
    // Bufor bezpieczeństwa 5 minut (300s) zamiast 60s, żeby uniknąć problemów brzegowych
    const expiryTime = Date.now() + (expiresIn - 300) * 1000;

    // 1. Zapisz w RAM (global)
    global.soundCloudTokenCache.token = response.data.access_token;
    global.soundCloudTokenCache.expiry = expiryTime;
    global.soundCloudTokenCache.fetchingPromise = null;

    // 2. Zapisz w PLIKU (persistence)
    writeTokenToFile(response.data.access_token, expiryTime);
    
    console.log("[Auth] Nowy token pobrany i zapisany.");
    return response.data.access_token;

  } catch (error) {
    global.soundCloudTokenCache.fetchingPromise = null;
    console.error("❌ [Auth] Błąd:", error.response?.data || error.message);
    throw new Error("Nie można uwierzytelnić się z SoundCloud API.");
  }
}

export async function getAccessToken() {
  const cache = global.soundCloudTokenCache;

  // KROK 1: Sprawdź RAM (najszybsze)
  if (cache.token && Date.now() < cache.expiry) {
    return cache.token;
  }

  // KROK 2: Sprawdź PLIK (jeśli RAM pusty po restarcie serwera)
  // Robimy to tylko jeśli nie trwa już pobieranie
  if (!cache.fetchingPromise) {
    const fileToken = readTokenFromFile();
    if (fileToken) {
      console.log("[Auth] Wczytano token z pliku tymczasowego.");
      return fileToken;
    }
  }

  // KROK 3: Pobierz z API (jeśli oba cache puste)
  if (!cache.fetchingPromise) {
    cache.fetchingPromise = fetchNewToken();
  }

  return await cache.fetchingPromise;
}

















































// import axios from 'axios';
// import querystring from 'querystring';

// // Zmienne bufora na poziomie modułu
// // let cachedToken = null;
// // let tokenExpiryTime = null;

// const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
// const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;

// if (!global.soundCloudTokenCache) {
//   global.soundCloudTokenCache = {
//     token: null,
//     expiry: 0,
//     fetchingPromise: null // Tutaj przechowujemy trwające zapytanie
//   };
// }

// // Funkcja do pobrania nowego tokena
// async function fetchNewToken() {
//   try {
//     const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
//     const tokenUrl = 'https://secure.soundcloud.com/oauth/token';
//     const data = { grant_type: 'client_credentials' };
    
//     const headers = {
//       'Content-Type': 'application/x-www-form-urlencoded',
//       'Authorization': `Basic ${basicAuth}`
//     };

//     const response = await axios.post(tokenUrl, querystring.stringify(data), { headers });


//     // Obliczamy czas wygaśnięcia
//     const expiresIn = response.data.expires_in; // zazwyczaj 3600 sekund
//     console.log("SoundCloud token expires in (s):", expiresIn);
//     const expiryTime = Date.now() + (expiresIn - 60) * 1000; // bufor 60s
//     console.log("SoundCloud token expiry time (ms):", expiryTime);

//     global.soundCloudTokenCache.token = response.data.access_token;
//     global.soundCloudTokenCache.expiry = expiryTime;
//     global.soundCloudTokenCache.fetchingPromise = null; // Czyścimy promise po zakończeniu
    
//     console.log("Pobrano nowy token SoundCloud.");
//     return response.data.access_token;

//   } catch (error) {
//     global.soundCloudTokenCache.fetchingPromise = null;
//     console.error("Krytyczny błąd podczas pobierania tokena SoundCloud:", error.response?.data || error.message);
//     throw new Error("Nie można uwierzytelnić się z SoundCloud API.");
//   }
// }

// export async function getAccessToken() {
//   const cache = global.soundCloudTokenCache;

//   // 1. Sprawdź, czy mamy ważny token
//   if (cache.token && Date.now() < cache.expiry) {
//     return cache.token;
//   }

//   // 2. Jeśli token wygasł lub go nie ma, sprawdź czy ktoś już go właśnie nie pobiera
//   if (!cache.fetchingPromise) {
//     // Jeśli nikt nie pobiera, my to robimy i zapisujemy Promisę
//     cache.fetchingPromise = fetchNewToken();
//   }

//   // 3. Zwracamy Promisę (wszystkie równoległe zapytania 'podczepią się' pod ten sam request)
//   return await cache.fetchingPromise;
// }

  
