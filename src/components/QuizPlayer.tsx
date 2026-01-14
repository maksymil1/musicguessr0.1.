import { useState } from "react";
import type { GameTrack, GameMode } from "../types/types";
import { useParams, Link, useLocation, Navigate } from "react-router-dom";
import HlsPlayer from "./HlsPlayer";

// Konfiguracja tekstów dla różnych trybów gry
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
  const location = useLocation();
  const { gameMode } = useParams<{ gameMode: string }>();

  const currentMode = (gameMode as GameMode) || "genre";
  const config = modeConfig[currentMode] || modeConfig.genre;
  const isGenre = gameMode !== "artist" && gameMode !== "playlist";

  // Zabezpieczenie przed wejściem bez wybranego gatunku
  if (isGenre && !location.state?.playlistUrn) {
    return <Navigate to="/genres" replace />;
  }

  const [inputValue, setInputValue] = useState("");
  const [score, setScore] = useState(0);

  const [gameQueue, setGameQueue] = useState<GameTrack[] | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Funkcja odtwarzania utworu z obsługą auto-skipu przy błędach
  const playTrackAtIndex = async (index: number, queue: GameTrack[]) => {
    if (index >= queue.length) {
      setIsGameOver(true);
      setStreamUrl(null);
      return;
    }

    setCurrentRound(index);
    setStreamUrl(null);
    setError(null);

    const track = queue[index];
    console.log(`Próba odtworzenia [Runda ${index + 1}]: ${track.title}`);

    try {
      const encodedUrn = encodeURIComponent(track.urn);
      const res = await fetch(`/api/stream/${encodedUrn}`);

      if (!res.ok) {
        console.warn(`Błąd streamu (${res.status}). Pomijanie utworu...`);
        playTrackAtIndex(index + 1, queue);
        return;
      }

      const data = await res.json();
      if (data.streamUrl) {
        setStreamUrl(data.streamUrl);
      } else {
        throw new Error("Pusty URL streamu");
      }
    } catch (err) {
      console.error(`Błąd przy utworze ${index}:`, err);
      playTrackAtIndex(index + 1, queue);
    }
  };

  const handleStartGame = async () => {
    if (!inputValue && !isGenre) return;

    setIsGameStarted(true);
    setIsGameOver(false);
    setGameQueue(null);
    setCurrentRound(0);
    setStreamUrl(null);
    setIsLoading(true);
    setError(null);

    try {
      const query = isGenre ? location.state.playlistUrn : inputValue;
      const apiMode = isGenre ? "genre" : currentMode;

      const res = await fetch(
        `/api/game/start?mode=${apiMode}&query=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error("Błąd pobierania listy utworów");

      const tracks: GameTrack[] = await res.json();
      if (tracks.length === 0) throw new Error("Brak utworów.");

      setGameQueue(tracks);
      playTrackAtIndex(0, tracks);
    } catch (err: any) {
      setError(err.message);
      setIsGameStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCorrectGuess = () => {
    setScore((prev) => prev + 1);
    if (gameQueue) {
        playTrackAtIndex(currentRound + 1, gameQueue);
    }
  };

  const currentGameTrack = gameQueue ? gameQueue[currentRound] : null;

  return (
    <div className="p-4 flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
      <div className="w-full flex justify-between items-center mb-6">
        {!isGameStarted && (
          <Link to="/modes" className="text-sm text-gray-500 hover:underline">
            ← Wróć do wyboru
          </Link>
        )}
        <h1 className="text-2xl font-bold mx-auto">SoundCloud Quiz</h1>
      </div>

      {/* SETUP */}
      {!isGameStarted && !isGameOver && (
        <div className="flex flex-col gap-4 w-full max-w-md items-center text-center">
          <h2 className="text-xl font-semibold uppercase tracking-widest text-gray-700">
            {config.label}
          </h2>

          <div className="w-full">
            {!isGenre && (
              <input
                className="border p-3 rounded text-black w-full shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={config.placeholder}
              />
            )}
          </div>

          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-all disabled:opacity-50"
            onClick={handleStartGame}
            disabled={isLoading || (!inputValue.trim() && !isGenre)}
          >
            {isLoading ? "Ładowanie..." : config.btnText}
          </button>

          {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded w-full text-sm">⚠️ {error}</div>}
        </div>
      )}

      {/* GRA */}
      {isGameStarted && !isGameOver && currentGameTrack && (
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="flex justify-between w-full text-sm font-bold text-gray-500">
            <span>Runda {currentRound + 1} / {gameQueue?.length}</span>
            <span>Wynik: {score}</span>
          </div>

          <div className="w-full bg-gray-900 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center min-h-[120px]">
            {streamUrl ? <HlsPlayer src={streamUrl} /> : (
              <div className="flex items-center gap-2 text-white/70">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Ładowanie audio...
              </div>
            )}
          </div>

          <div className="text-xs text-gray-400 border border-dashed border-gray-300 p-2 w-full text-center">
            <p>(DEBUG) Podpowiedź: {currentGameTrack.title} - {currentGameTrack.artist}</p>
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
          <h2 className="text-4xl text-orange-500 font-bold mb-2">Koniec Gry!</h2>
          <p className="text-xl mb-6">Twój wynik: {score} / {gameQueue?.length || 0}</p>
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