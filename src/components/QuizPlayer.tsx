import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import HlsPlayer from "./HlsPlayer";
import type { GameTrack, GameMode } from "../types/types";

interface QuizPlayerProps {
  mode: GameMode;
  roomId: string; // Teraz wymagane
  isHost: boolean;
  initialQuery?: string;
}

export default function QuizPlayer({
  mode,
  roomId,
  isHost,
  initialQuery,
}: QuizPlayerProps) {
  const navigate = useNavigate();
  const playerRef = useRef<HTMLAudioElement>(null);

  // --- STAN ---
  const [inputValue, setInputValue] = useState("");
  const [gameQueue, setGameQueue] = useState<GameTrack[] | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. START GRY (Tylko HOST) ---
  const handleStartGame = async () => {
    // Gość nigdy nie powinien tego wywołać, ale dla pewności:
    if (!isHost) return;

    if (!inputValue && mode !== "genre" && !initialQuery) return;
    setIsLoading(true);
    setStatus("Pobieranie utworów...");

    try {
      const query = initialQuery || inputValue;
      const res = await fetch(
        `/api/game/start?mode=${mode}&query=${encodeURIComponent(query)}`
      );

      if (!res.ok) throw new Error("Błąd pobierania utworów");
      const tracks: GameTrack[] = await res.json();

      if (tracks.length === 0) throw new Error("Brak utworów.");

      // SCENARIUSZ MULTI: Wysyłamy kolejkę do bazy
      console.log("Host wysyła kolejkę do bazy...");
      await supabase
        .from("Room")
        .update({
          gameQueue: tracks,
          currentRound: 0,
          currentSongStart: null, // Reset czasu
        })
        .eq("id", roomId);
    } catch (e: any) {
      console.error(e);
      setStatus(`Błąd: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. SUBSRYPCJA STANU POKOJU ---
  useEffect(() => {
    if (!roomId) return;

    setStatus(isHost ? "Wpisz frazę i zacznij grę" : "Czekanie na Hosta...");

    // A. Stan początkowy
    const fetchInitialState = async () => {
      const { data } = await supabase
        .from("Room")
        .select("gameQueue, currentRound, currentSongStart")
        .eq("id", roomId)
        .single();
      if (data?.gameQueue) {
        setGameQueue(data.gameQueue);
        setCurrentRound(data.currentRound);
        setIsGameStarted(true);

        const track = data.gameQueue[data.currentRound];
        if (track) resolveAndPlayStream(track.urn, data.currentSongStart);
      }
    };
    fetchInitialState();

    // B. Realtime Updates
    const channel = supabase
      .channel(`game-logic-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Room",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newData = payload.new;

          // Nowa gra wystartowała
          if (newData.gameQueue && (!gameQueue || newData.currentRound === 0)) {
            setGameQueue(newData.gameQueue);
            setIsGameStarted(true);
            // Upewniamy się, że UI jest zresetowane
            if (newData.currentRound === 0) setCurrentRound(0);
          }

          // Zmiana rundy
          if (newData.currentRound !== undefined && newData.gameQueue) {
            setCurrentRound(newData.currentRound);
            const track = newData.gameQueue[newData.currentRound];
            if (track)
              resolveAndPlayStream(track.urn, newData.currentSongStart);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isHost]); // Usunięto 'gameQueue' z deps, żeby uniknąć pętli

  // --- 3. AUDIO ---
  const resolveAndPlayStream = async (
    urn: string,
    serverStartTime?: string
  ) => {
    setStreamUrl(null);
    setStatus("Ładowanie audio...");

    try {
      const encodedUrn = encodeURIComponent(urn);
      const res = await fetch(`/api/stream/${encodedUrn}`);

      if (!res.ok) {
        // Jeśli błąd, tylko HOST skipuje
        if (isHost) handleNextRound();
        return;
      }

      const data = await res.json();
      if (data.streamUrl) {
        setStreamUrl(data.streamUrl);

        // SYNCHRONIZACJA
        if (serverStartTime && playerRef.current) {
          const startTimeMs = new Date(serverStartTime).getTime();
          const nowMs = Date.now();
          const diffSec = (nowMs - startTimeMs) / 1000;
          if (diffSec > 0) {
            playerRef.current.currentTime = diffSec;
          }
        }
        setStatus(`Runda ${currentRound + 1}`);
      }
    } catch (e) {
      console.error("Stream error:", e);
      if (isHost) handleNextRound();
    }
  };

  // --- 4. STEROWANIE ---
  const handleNextRound = async () => {
    if (!isHost || !gameQueue) return; // Tylko Host

    // Logika końca gry
    if (currentRound + 1 >= gameQueue.length) {
      setStatus("KONIEC GRY!");
      setStreamUrl(null);
      return; // Tu można dodać update statusu pokoju na "FINISHED"
    }

    const nextRound = currentRound + 1;
    const now = new Date().toISOString();

    await supabase
      .from("Room")
      .update({
        currentRound: nextRound,
        currentSongStart: now,
      })
      .eq("id", roomId);
  };

  const handleCorrectGuess = () => {
    setScore((s) => s + 1);
    // Gość nie skipuje rundy, tylko Host.
    // Jeśli chcesz, żeby gość mógł skipować po zgadnięciu, musiałby wysłać RPC.
    // W obecnej wersji tylko Host klika SKIP.
  };

  // --- WIDOK: SETUP ---
  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center gap-4 mt-10">
        <h2 className="text-white text-2xl uppercase font-bold">{mode} MODE</h2>

        {isHost ? (
          <>
            {mode === "playlist" && !initialQuery && (
              <input
                className="p-3 rounded text-black w-64"
                placeholder="Wklej link do playlisty..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            {mode === "artist" && !initialQuery && (
              <input
                className="p-3 rounded text-black w-64"
                placeholder="Wpisz np. Tame Impala..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            <button
              onClick={handleStartGame}
              disabled={isLoading}
              className="bg-green-500 text-black font-bold py-3 px-8 rounded hover:bg-green-400"
            >
              {isLoading ? "ŁADOWANIE..." : "START GAME"}
            </button>
            {status && <p className="text-red-400">{status}</p>}
          </>
        ) : (
          <div className="text-white animate-pulse">
            <p className="text-xl">Oczekiwanie na Hosta...</p>
            <p className="text-sm text-gray-400">Host wybiera utwory.</p>
          </div>
        )}

        <button
          onClick={() => navigate("/")}
          className="text-gray-500 mt-4 underline"
        >
          Wyjdź
        </button>
      </div>
    );
  }

  // --- WIDOK: GRA ---
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between w-full text-white font-bold">
        <span>
          Runda: {currentRound + 1} / {gameQueue?.length}
        </span>
        <span>Wynik: {score}</span>
      </div>

      <div className="bg-gray-800 px-6 py-2 rounded-full text-green-400 font-mono">
        {status || "GRA W TOKU"}
      </div>

      <div className="w-full bg-black/50 p-6 rounded-xl flex justify-center min-h-[100px]">
        {streamUrl ? (
          <HlsPlayer src={streamUrl} playerRef={playerRef} />
        ) : (
          <div className="animate-spin h-6 w-6 border-2 border-green-500 rounded-full border-t-transparent" />
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleCorrectGuess}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition"
        >
          ZGADŁEM (+1 PKT)
        </button>

        {isHost && (
          <button
            onClick={handleNextRound}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition"
          >
            SKIP ⏭
          </button>
        )}
      </div>
    </div>
  );
}
