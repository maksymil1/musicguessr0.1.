import React, { useState } from "react";
import HlsPlayer from "./HlsPlayer"; // Upewnij się, że ten import działa (może być bez .tsx)

// ID utworu do testów
const TEST_TRACK_ID = "718696735";

// Twój Client ID (wziąłem z Twojego pliku .env)
// Normalnie powinien być w zmiennej środowiskowej z prefixem VITE_, ale tu wpisujemy na sztywno, żeby zadziałało od razu.
const SC_CLIENT_ID = "MYGy7K3hK1ZIduBISIOJee7TfiZ6vaQO";

const QuizPlayer: React.FC = () => {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Funkcja, która udaje Twój backend - rozwiązuje link bezpośrednio w przeglądarce
  const resolveSoundCloudStream = async (trackId: string) => {
    try {
      // 1. Pobieramy dane o utworze z API SoundCloud v2
      const trackResponse = await fetch(
        `https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${SC_CLIENT_ID}`
      );

      if (!trackResponse.ok) {
        throw new Error(`Błąd SoundCloud API: ${trackResponse.status}`);
      }

      const trackData = await trackResponse.json();

      // 2. Szukamy odpowiedniego formatu transkodowania (HLS)
      // SoundCloud ma różne formaty, szukamy tego z protokołem 'hls' i mime-type 'audio/mpeg' lub 'audio/ogg'
      const transcoding = trackData.media.transcodings.find(
        (t: any) => t.format.protocol === "hls" && (t.format.mime_type.includes("mpeg") || t.format.mime_type.includes("mp4"))
      );

      if (!transcoding) {
        throw new Error("Nie znaleziono strumienia HLS dla tego utworu.");
      }

      // 3. Pobieramy finalny link do pliku .m3u8
      // URL z transcodings wymaga doklejenia client_id
      const streamUrlResponse = await fetch(
        `${transcoding.url}?client_id=${SC_CLIENT_ID}`
      );
      
      if (!streamUrlResponse.ok) {
         throw new Error("Nie udało się pobrać linku do strumienia.");
      }

      const streamData = await streamUrlResponse.json();
      
      return streamData.url; // To jest właściwy link .m3u8

    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || "Błąd rozwiązywania utworu SoundCloud");
    }
  };

  const handlePlayTestTrack = async () => {
    setIsLoading(true);
    setError(null);
    setStreamUrl(null);

    try {
      // ZAMIAST: fetch('/api/stream/...')
      // ROBIMY: Bezpośrednie rozwiązanie linku
      const url = await resolveSoundCloudStream(TEST_TRACK_ID);
      
      console.log("Uzyskany stream URL:", url);
      setStreamUrl(url);

    } catch (err) {
      if (err instanceof Error) {
        console.error("Błąd odtwarzania:", err.message);
        setError(err.message);
      } else {
        setError("Wystąpił nieoczekiwany błąd.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", color: "white", background: "#333", borderRadius: "8px" }}>
      <h2>Testowy Odtwarzacz Quizu (Bez Backendu)</h2>
      <p>ID Utworu: {TEST_TRACK_ID}</p>

      <button 
        onClick={handlePlayTestTrack} 
        disabled={isLoading}
        style={{ 
            padding: "10px 20px", 
            cursor: "pointer", 
            background: isLoading ? "gray" : "#f50", 
            color: "white", 
            border: "none", 
            borderRadius: "4px",
            fontSize: "16px"
        }}
      >
        {isLoading ? "Pobieranie danych..." : "Odtwórz utwór testowy"}
      </button>

      {error && (
        <div style={{ color: "#ff6b6b", marginTop: "15px", padding: "10px", border: "1px solid #ff6b6b" }}>
          <strong>Błąd:</strong> {error}
        </div>
      )}

      {streamUrl && (
        <div style={{ marginTop: "20px" }}>
          <p style={{color: "#4ade80"}}>Strumień gotowy!</p>
          {/* Upewnij się, że HlsPlayer jest poprawnie zaimportowany */}
          <HlsPlayer src={streamUrl} />
        </div>
      )}
    </div>
  );
};

export default QuizPlayer;