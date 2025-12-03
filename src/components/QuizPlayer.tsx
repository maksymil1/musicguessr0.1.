import { useState } from "react";
import type { GameTrack, GameMode } from "../types/types"; // Upewnij się, że ścieżka jest poprawna
import { useParams, Link } from "react-router-dom";
import HlsPlayer from "./HlsPlayer";

// Konfiguracja tekstów w zależności od trybu
const modeConfig: Record<
  GameMode,
  { label: string; placeholder: string; btnText: string }
> = {
  genre: {
    label: "Wpisz gatunek muzyczny",
    placeholder: "np. indie rock, house, jazz...",
    btnText: "Losuj z gatunku",
  },
  artist: {
    label: "Podaj nazwę artysty",
    placeholder: "np. Tame Impala, Daft Punk...",
    btnText: "Szukaj artysty",
  },
  playlist: {
    label: "Wklej link do playlisty SoundCloud",
    placeholder: "https://soundcloud.com/uzytkownik/sets/nazwa-playlisty",
    btnText: "Załaduj playlistę",
  },
};

const QuizPlayer = () => {
  // 1. Pobieramy parametr z URL (musi nazywać się tak samo jak w routerze: :gameMode)
  const { gameMode } = useParams<{ gameMode: string }>();

  // Rzutowanie na typ GameMode (zakładamy, że router puszcza tylko poprawne, ale można dodać walidację)
  const currentMode = (gameMode as GameMode) || "genre";
  const config = modeConfig[currentMode] || modeConfig.genre;

  const [inputValue, setInputValue] = useState("");
  const [score, setScore] = useState(0);

  const [gameQueue, setGameQueue] = useState<GameTrack[] | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // START GRY
  const handleStartGame = async () => {
    if (!inputValue) return;
    setIsGameStarted(true);
    setIsGameOver(false);
    setGameQueue(null);
    setCurrentRound(0);
    setStreamUrl(null);
    setIsLoading(true);
    setError(null);

    try {
      // Używamy currentMode zamiast gameMode ze stanu
      const res = await fetch(
        `/api/game/start?mode=${currentMode}&query=${encodeURIComponent(
          inputValue
        )}`
      );
      if (!res.ok) throw new Error("Błąd pobierania listy utworów");

      const tracks: GameTrack[] = await res.json();
      setGameQueue(tracks);

      // Ładujemy pierwszy utwór
      if (tracks.length > 0) {
        loadStreamForTrack(tracks[0].id);
      } else {
        throw new Error("Nie znaleziono utworów dla tego zapytania.");
      }
    } catch (err: any) {
      setError(err.message);
      setIsGameStarted(false); // Cofnij start gry w przypadku błędu
    } finally {
      setIsLoading(false);
    }
  };

  // ŁADOWANIE UTWORU (z Auto-Skipem)
  const loadStreamForTrack = async (trackId: number) => {
    setStreamUrl(null);
    setError(null);

    try {
      const res = await fetch(`/api/stream/${trackId}`);

      if (!res.ok) {
        console.warn(
          `Utwór ${trackId} niedostępny (Błąd ${res.status}). Pomijanie...`
        );
        handleNextRound(true);
        return;
      }

      const data = await res.json();
      if (data.streamUrl) {
        setStreamUrl(data.streamUrl);
      } else {
        throw new Error("Brak URL");
      }
    } catch (err) {
      console.error("Błąd sieci/streamu:", err);
      handleNextRound(true);
    }
  };

  // PRZEJŚCIE DALEJ
  const handleNextRound = (skipScore = false) => {
    if (!gameQueue) return;
    if (skipScore) {
      console.log("Runda pominięta bez punktu.");
    }

    const nextRound = currentRound + 1;
    if (nextRound < gameQueue.length) {
      setCurrentRound(nextRound);
      loadStreamForTrack(gameQueue[nextRound].id);
    } else {
      setIsGameOver(true);
      setStreamUrl(null);
    }
  };

  const handleCorrectGuess = () => {
    handleNextRound(false);
    setScore(score + 1);
  };

  const currentGameTrack = gameQueue ? gameQueue[currentRound] : null;

  return (
    <div className="p-4 flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
      {/* Nagłówek i powrót */}
      <div className="w-full flex justify-between items-center mb-6">
        {!isGameStarted && (
          <Link to="/modes" className="text-sm text-gray-500 hover:underline">
            ← Wróć do wyboru
          </Link>
        )}
        <h1 className="text-2xl font-bold mx-auto">SoundCloud Quiz</h1>
      </div>

      {/* SETUP - Widok Konfiguracji */}
      {!isGameStarted && !isGameOver && (
        <div className="flex flex-col gap-4 w-full max-w-md items-center text-center">
          <h2 className="text-xl font-semibold uppercase tracking-widest text-gray-700">
            TRYB: {config.label}
          </h2>

          <div className="w-full">
            <label className="block text-left text-sm font-medium text-gray-600 mb-1">
              {config.label}
            </label>
            <input
              className="border p-3 rounded text-black w-full shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={config.placeholder}
            />
          </div>

          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            onClick={handleStartGame}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? "Ładowanie..." : config.btnText}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded w-full text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>
      )}

      {/* GRA - Widok Rozgrywki */}
      {isGameStarted && !isGameOver && currentGameTrack && (
        <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
          <div className="flex justify-between w-full text-sm font-bold text-gray-500">
            <span>
              Runda {currentRound + 1} / {gameQueue?.length}
            </span>
            <span>Wynik: {score}</span>
          </div>

          {/* Odtwarzacz */}
          <div className="w-full bg-gray-900 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center min-h-[120px]">
            {streamUrl ? (
              <HlsPlayer src={streamUrl} />
            ) : (
              <div className="flex items-center gap-2 text-white/70">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Ładowanie audio...
              </div>
            )}
          </div>

          {/* Debug Info (do usunięcia na produkcji) */}
          <div className="text-xs text-gray-400 border border-dashed border-gray-300 p-2 w-full text-center">
            <p>
              aktualnie odtwarzany: {currentGameTrack.title} -{" "}
              {currentGameTrack.artist}
            </p>
          </div>

          <button
            onClick={handleCorrectGuess}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg shadow font-bold transition-transform active:scale-95"
          >
            SYMULUJ POPRAWNĄ ODPOWIEDŹ
          </button>
        </div>
      )}

      {/* KONIEC */}
      {isGameOver && (
        <div className="text-center py-10">
          <h2 className="text-4xl text-orange-500 font-bold mb-2">
            Koniec Gry!
          </h2>
          <p className="text-xl mb-6">
            Twój wynik: {score} / {gameQueue?.length}
          </p>

          <button
            onClick={() => setIsGameStarted(false)}
            className="border-2 border-gray-800 px-6 py-2 rounded-full font-bold hover:bg-gray-800 hover:text-white transition-colors"
          >
            Zagraj ponownie
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizPlayer;
