import { useState } from "react";
import { useParams } from "react-router-dom"; // 1. Import hooka
import HlsPlayer from "./HlsPlayer.tsx";

interface StreamApiResponse {
  streamUrl: string;
  error?: string;
}

const TEST_TRACK_ID = "2181630667"; // id utworu do testów

// Definiujemy dozwolone tryby gry dla bezpieczeństwa typów
type GameMode = "playlist" | "genre" | "artist";

export default function QuizPlayer() {
  const { gameMode } = useParams<{ gameMode: GameMode }>();
  const [inputValue, setInputValue] = useState("");

  const [isGameStarted, setIsGameStarted] = useState(false);

  // Stany odtwarzacza (z Twojego kodu)
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- LOGIKA UI: Teksty w zależności od trybu ---
  const getInputLabel = () => {
    switch (gameMode) {
      case "playlist":
        return "Podaj link do playlisty SoundCloud:";
      case "genre":
        return "Wpisz gatunek (np. house, rock):";
      case "artist":
        return "Podaj nazwę artysty:";
      default:
        return "Wpisz wartość:";
    }
  };

  const getButtonLabel = () => {
    switch (gameMode) {
      case "playlist":
        return "Załaduj Playlistę";
      case "genre":
        return "Losuj z Gatunku";
      case "artist":
        return "Losuj Artystę";
      default:
        return "Start";
    }
  };

  const getPlaceholder = () => {
    switch (gameMode) {
      case "playlist":
        "https://soundcloud.com/...";
        break;
      case "artist":
        return "np. Nirvana";
        break;
      case "genre":
        return "np. house, rock";
        break;
      default:
        return "Wpisz wartość";
    }
  };

  const handleStartGame = async () => {
    if (!inputValue) return;

    setIsGameStarted(true);
    setIsLoading(true);
    setError(null);
    setStreamUrl(null);

    console.log(`Startujemy tryb: ${gameMode} z wartością: ${inputValue}`);

    // TUTAJ BĘDZIE TWOJA LOGIKA FETCHOWANIA
    // W przyszłości przekażesz 'gameMode' i 'inputValue' do swojego API

    // Na razie symulacja (Twoja stara logika testowa):
    try {
      // Wywołaj WŁASNE API proxy
      const response = await fetch(`/api/stream/${TEST_TRACK_ID}`);

      if (!response.ok) {
        const errorData: Partial<StreamApiResponse> = await response.json();
        throw new Error(errorData.error || `Błąd serwera: ${response.status}`);
      }

      const data: StreamApiResponse = await response.json();

      if (data.streamUrl) {
        setStreamUrl(data.streamUrl);
      } else {
        throw new Error("API nie zwróciło streamUrl.");
      }
    } catch (err) {
      // --- TypeScript: Poprawna obsługa błędów w bloku catch ---
      // 'err' jest domyślnie typu 'unknown', więc sprawdzamy, czy jest instancją Error
      if (err instanceof Error) {
        console.error("Nie udało się pobrać strumienia:", err.message);
        setError(err.message);
      } else {
        console.error("Nieznany błąd:", err);
        setError("Wystąpił nieoczekiwany błąd.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 1. WIDOK KONFIGURACJI (Jeśli gra nie wystartowała)
  if (!isGameStarted) {
    return (
      <div
        className="quiz-setup-container"
        style={{ textAlign: "center", marginTop: "50px" }}
      >
        <h2>Tryb: {gameMode?.toUpperCase()}</h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: "1.2rem" }}>{getInputLabel()}</label>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={getPlaceholder()}
            style={{
              padding: "10px",
              fontSize: "1rem",
              width: "300px",
              borderRadius: "8px",
            }}
          />

          <button
            className="menu-button" // Możesz użyć klas ze swoich stylów
            onClick={handleStartGame}
            style={{ padding: "10px 30px", cursor: "pointer" }}
          >
            {getButtonLabel()}
          </button>
        </div>
      </div>
    );
  }

  // 2. WIDOK GRY (Jeśli gra wystartowała)
  return (
    <div>
      <button onClick={() => setIsGameStarted(false)}>← Wróć do wyboru</button>

      <h2>Odtwarzacz Quizu</h2>
      {isLoading && <p>Ładowanie utworów dla: {inputValue}...</p>}

      {error && (
        <div style={{ color: "red", marginTop: "10px" }}>
          <strong>Błąd:</strong> {error}
        </div>
      )}

      {streamUrl && (
        <div style={{ marginTop: "20px" }}>
          <HlsPlayer src={streamUrl} />
        </div>
      )}
    </div>
  );
}
