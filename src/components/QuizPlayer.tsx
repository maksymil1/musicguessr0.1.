import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import HlsPlayer from "./HlsPlayer";
import type { GameTrack, GameMode } from "../types/types";

interface QuizPlayerProps {
  mode: GameMode;
  roomId: string;
  isHost: boolean;
  initialQuery?: string;
  onGameFinish: () => void;
  onGameStateChange?: (updates: any) => void;
}

export default function QuizPlayer({
  mode,
  roomId,
  isHost,
  initialQuery,
  onGameFinish,
  onGameStateChange,
}: QuizPlayerProps) {
  const playerRef = useRef<HTMLAudioElement>(null);
  const queueRef = useRef<GameTrack[] | null>(null);
  const roundRef = useRef(0);
  const isHostRef = useRef(isHost);

  const [inputValue, setInputValue] = useState("");
  const [gameQueue, setGameQueue] = useState<GameTrack[] | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isItunesSource, setIsItunesSource] = useState(false);
  const [status, setStatus] = useState("");
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    queueRef.current = gameQueue;
  }, [gameQueue]);
  useEffect(() => {
    roundRef.current = currentRound;
  }, [currentRound]);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // Cleanup audio
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.src = "";
      }
    };
  }, []);

  // --- 1. START GRY (HOST) ---
  const handleStartGame = async () => {
    if (!isHost) return;
    if (!inputValue && mode !== "genre" && !initialQuery) return;

    setIsLoading(true);
    setStatus("Pobieranie utworów...");

    try {
      const query = initialQuery || inputValue;
      const res = await fetch(
        `/api/game/start?mode=${mode}&query=${encodeURIComponent(query)}`,
      );

      if (!res.ok) throw new Error("Błąd API");
      const tracks: GameTrack[] = await res.json();

      if (!tracks || tracks.length === 0) throw new Error("Brak utworów.");

      const now = new Date().toISOString();

      const { error } = await supabase
        .from("Room")
        .update({
          gameQueue: tracks,
          currentRound: 0,
          currentSongStart: now,
          status: "PLAYING",
        })
        .eq("id", roomId);

      if (error) throw error;

      setGameQueue(tracks);
      setCurrentRound(0);
      setIsGameStarted(true);
      setStatus("Gra wystartowała!");

      // Update rodzica (Host Start)
      if (onGameStateChange) {
        onGameStateChange({
          gameQueue: tracks,
          currentRound: 0,
          status: "PLAYING",
          currentSongStart: now,
        });
      }

      resolveAndPlayStream(tracks[0].urn, now);
    } catch (e: any) {
      console.error(e);
      setStatus(`Błąd: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. SUBSKRYPCJA I SYNC (GOŚCIE + REFRESH) ---
  useEffect(() => {
    if (!roomId) return;
    if (!isHost) setStatus("Czekanie na Hosta...");

    // A. Pobierz stan początkowy (dla wchodzących w trakcie)
    const fetchInitialState = async () => {
      const { data } = await supabase
        .from("Room")
        .select("*")
        .eq("id", roomId)
        .single();
      if (data?.status === "PLAYING" && data.gameQueue) {
        setGameQueue(data.gameQueue);
        setCurrentRound(data.currentRound);
        setIsGameStarted(true);
        setStatus("Dołączono do gry.");

        // !!! POPRAWKA: Informujemy rodzica o stanie gry przy wejściu !!!
        if (onGameStateChange) {
          console.log("[QuizPlayer] Initial Sync -> Update Parent");
          onGameStateChange({
            gameQueue: data.gameQueue,
            currentRound: data.currentRound,
            status: "PLAYING",
            currentSongStart: data.currentSongStart,
          });
        }

        const track = data.gameQueue[data.currentRound];
        if (track && data.currentSongStart) {
          resolveAndPlayStream(track.urn, data.currentSongStart);
        }
      }
    };
    fetchInitialState();

    // B. Realtime Updates
    const channel = supabase
      .channel(`quiz-player-${roomId}`)
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
          const currentQ = queueRef.current;
          const currentR = roundRef.current;

          // Wykrycie startu gry (Gość)
          if (newData.status === "PLAYING" && newData.gameQueue && !currentQ) {
            setGameQueue(newData.gameQueue);
            setIsGameStarted(true);
            setCurrentRound(0);
            setStatus("Gra wystartowała!");

            // !!! POPRAWKA: Informujemy rodzica przy starcie z Realtime !!!
            if (onGameStateChange) {
              onGameStateChange({
                gameQueue: newData.gameQueue,
                currentRound: 0,
                status: "PLAYING",
                currentSongStart: newData.currentSongStart,
              });
            }

            if (newData.currentSongStart && newData.gameQueue[0]) {
              resolveAndPlayStream(
                newData.gameQueue[0].urn,
                newData.currentSongStart,
              );
            }
            return;
          }

          // Zmiana rundy
          if (
            newData.currentRound !== undefined &&
            currentQ &&
            newData.currentRound !== currentR
          ) {
            setCurrentRound(newData.currentRound);

            // !!! POPRAWKA: Informujemy rodzica o zmianie rundy (Gość) !!!
            if (onGameStateChange) {
              onGameStateChange({
                currentRound: newData.currentRound,
                currentSongStart: newData.currentSongStart,
              });
            }

            const track = currentQ[newData.currentRound];
            if (track && newData.currentSongStart) {
              resolveAndPlayStream(track.urn, newData.currentSongStart);
            }
          }

          if (newData.status === "FINISHED") {
            setStatus("KONIEC GRY");
            setStreamUrl(null);
            onGameFinish();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, onGameFinish]); // Ważne: onGameStateChange nie musi być w dependency jeśli jest stabilne

  // --- 3. LOGIKA AUDIO ---
  const resolveAndPlayStream = async (
    urn: string,
    serverStartTime?: string,
  ) => {
    setStreamUrl(null);
    setStatus("Ładowanie...");

    try {
      let finalUrl = "";
      if (urn.startsWith("http")) {
        setIsItunesSource(true);
        finalUrl = urn;
      } else {
        setIsItunesSource(false);
        const encodedUrn = encodeURIComponent(urn);
        const res = await fetch(`/api/stream/${encodedUrn}`);
        if (!res.ok) throw new Error("Błąd streamu SC");
        const data = await res.json();
        if (data.streamUrl) finalUrl = data.streamUrl;
      }

      if (finalUrl) {
        setStreamUrl(finalUrl);
        setStatus(`Runda ${(roundRef.current || 0) + 1}`);
        setTimeout(() => {
          if (serverStartTime && playerRef.current) {
            const startTimeMs = new Date(serverStartTime).getTime();
            const nowMs = Date.now();
            const diffSec = (nowMs - startTimeMs) / 1000;
            if (diffSec > 0 && diffSec < 29) {
              playerRef.current.currentTime = diffSec;
              playerRef.current
                .play()
                .catch((e) => console.log("Autoplay blocked:", e));
            } else {
              playerRef.current
                .play()
                .catch((e) => console.log("Autoplay blocked:", e));
            }
          }
        }, 200);
      }
    } catch (e) {
      console.error("Błąd audio:", e);
      setStatus("Błąd audio - czekaj na następną rundę");
    }
  };

  // --- 4. STEROWANIE ---
  const handleNextRound = async () => {
    if (!isHostRef.current || !queueRef.current) return;
    const currentR = roundRef.current;
    const queue = queueRef.current;

    if (currentR + 1 >= queue.length) {
      await supabase
        .from("Room")
        .update({ status: "FINISHED" })
        .eq("id", roomId);
      onGameFinish();
      return;
    }

    const nextRound = currentR + 1;
    const now = new Date().toISOString();

    await supabase
      .from("Room")
      .update({ currentRound: nextRound, currentSongStart: now })
      .eq("id", roomId);

    setCurrentRound(nextRound);

    // Update rodzica (Host Next Round)
    if (onGameStateChange) {
      onGameStateChange({
        currentRound: nextRound,
        currentSongStart: now,
      });
    }

    resolveAndPlayStream(queue[nextRound].urn, now);
  };

  const onAudioEnded = () => {
    if (!isHostRef.current) return;
    if (playerRef.current && playerRef.current.currentTime < 5) return;
    handleNextRound();
  };

  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center gap-4 mt-10 w-full max-w-md mx-auto">
        <h2 className="text-white text-2xl uppercase font-bold">{mode} MODE</h2>
        {isHost ? (
          <div className="flex flex-col gap-3 w-full items-center">
            {mode === "playlist" && !initialQuery && (
              <input
                className="p-3 rounded text-black w-full"
                placeholder="Wklej link..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            {mode === "artist" && !initialQuery && (
              <input
                className="p-3 rounded text-black w-full"
                placeholder="Wpisz np. Tame Impala..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            <button
              onClick={handleStartGame}
              disabled={isLoading}
              className="bg-green-500 text-black font-bold py-3 px-8 rounded-full hover:bg-green-400 transition-all w-full shadow-lg"
            >
              {isLoading ? "POBIERANIE..." : "START GAME"}
            </button>
            {status && <p className="text-yellow-400 text-sm mt-2">{status}</p>}
          </div>
        ) : (
          <div className="text-white animate-pulse text-center">
            <p className="text-xl font-bold">OCZEKIWANIE NA HOSTA</p>
            <p className="text-sm text-gray-400 mt-2">
              Host konfiguruje rozgrywkę...
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between w-full text-white font-bold text-lg border-b border-gray-700 pb-2">
        <span>
          Runda {currentRound + 1} / {gameQueue?.length}
        </span>
        <span className="text-green-400">{status}</span>
      </div>

      <div className="w-full bg-gray-900/80 p-6 rounded-xl flex flex-col items-center justify-center min-h-[120px] shadow-2xl border border-gray-700">
        {streamUrl ? (
          <>
            {isItunesSource ? (
              <audio
                ref={playerRef}
                src={streamUrl}
                controls={false}
                autoPlay
                onEnded={onAudioEnded}
              />
            ) : (
              <HlsPlayer src={streamUrl} playerRef={playerRef} />
            )}
            <div className="flex items-center gap-3">
              <div className="flex gap-1 h-8 items-end">
                <div className="w-1 bg-green-500 animate-[bounce_1s_infinite] h-4"></div>
                <div className="w-1 bg-green-500 animate-[bounce_1.2s_infinite] h-6"></div>
                <div className="w-1 bg-green-500 animate-[bounce_0.8s_infinite] h-3"></div>
              </div>
              <span className="text-white font-bold tracking-widest text-xl">
                ON AIR
              </span>
            </div>
            {isHost && gameQueue && gameQueue[currentRound] && (
              <div className="mt-6 p-3 bg-black/50 border border-yellow-500/50 rounded-lg text-center animate-fade-in">
                <p className="text-xs text-yellow-500/80 font-mono mb-1 uppercase tracking-widest">
                  👁️ Host Preview (Tylko Ty to widzisz)
                </p>
                <p className="text-yellow-300 font-bold text-lg">
                  {gameQueue[currentRound].artist} -{" "}
                  {gameQueue[currentRound].title}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent" />
            <p className="text-gray-400 text-sm">Synchronizacja...</p>
          </div>
        )}
      </div>

      {isHost && (
        <button
          onClick={handleNextRound}
          className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition w-full max-w-xs border border-gray-600"
        >
          SKIP ROUND ⏭
        </button>
      )}

      {!isHost && (
        <p className="text-gray-500 text-sm italic">
          Słuchaj muzyki i zgaduj tytuł na czacie po prawej!
        </p>
      )}
    </div>
  );
}