import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import HlsPlayer from "./HlsPlayer";
import { useVolume } from "../context/VolumeContext"; // <--- IMPORT CONTEXTU
import type { GameTrack, GameMode } from "../types/types";

interface QuizPlayerProps {
  mode: GameMode;
  roomId: string;
  isHost: boolean;
  initialQuery?: string;
  onGameFinish: () => void;
  onGameStateChange?: (updates: any) => void;
  // volume prop usunięty - bierzemy go z Contextu
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

  // --- PODPIĘCIE POD GLOBALNY CONTEXT ---
  const { volume, isMuted } = useVolume();
  
  // Ref do głośności, aby w event listenerach (onPlay) mieć zawsze świeżą wartość bez restartu
  const volumeSettingsRef = useRef({ volume, isMuted });

  useEffect(() => {
    volumeSettingsRef.current = { volume, isMuted };
  }, [volume, isMuted]);

  // Refy dla callbacków
  const onGameFinishRef = useRef(onGameFinish);
  const onGameStateChangeRef = useRef(onGameStateChange);

  useEffect(() => {
    onGameFinishRef.current = onGameFinish;
    onGameStateChangeRef.current = onGameStateChange;
  }, [onGameFinish, onGameStateChange]);

  const [inputValue, setInputValue] = useState("");
  const [gameQueue, setGameQueue] = useState<GameTrack[] | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isItunesSource, setIsItunesSource] = useState(false);
  const [status, setStatus] = useState("");
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSongStartTime, setCurrentSongStartTime] = useState<string | null>(null);

  // --- FUNKCJA APLIKUJĄCA GŁOŚNOŚĆ ---
  const enforceVolume = useCallback(() => {
    if (playerRef.current) {
      const { volume: vol, isMuted: muted } = volumeSettingsRef.current;
      
      if (muted) {
        playerRef.current.volume = 0;
      } else {
        // Skalowanie logarytmiczne dla bardziej naturalnego odczucia (x^2)
        const normalized = vol / 100;
        const safeVolume = Math.min(Math.max(normalized, 0), 1);
        playerRef.current.volume = Math.pow(safeVolume, 2);
      }
    }
  }, []);

  // Reakcja na zmianę suwaka lub mute w czasie rzeczywistym
  useEffect(() => {
    enforceVolume();
  }, [volume, isMuted, enforceVolume]);

  // --- AUTOMATYCZNY START ODTWARZANIA ---
  useEffect(() => {
    if (!streamUrl || !playerRef.current) return;

    let isCancelled = false;
    
    const playAudio = async () => {
      try {
        const player = playerRef.current;
        if (!player) return;

        // 1. Ustaw głośność PRZED startem
        enforceVolume();

        // 2. Synchronizacja czasu
        if (currentSongStartTime) {
          const startTimeMs = new Date(currentSongStartTime).getTime();
          const nowMs = Date.now();
          const diffSec = (nowMs - startTimeMs) / 1000;
          
          if (diffSec > 0 && diffSec < 29) {
            player.currentTime = diffSec;
          }
        }

        // 3. Próba odtworzenia
        if (!isCancelled) {
          await player.play();
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Autoplay blocked/failed:", err);
        }
      }
    };

    const timeoutId = setTimeout(playAudio, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [streamUrl, currentSongStartTime, enforceVolume]);

  useEffect(() => { queueRef.current = gameQueue; }, [gameQueue]);
  useEffect(() => { roundRef.current = currentRound; }, [currentRound]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.src = "";
      }
    };
  }, []);

  // --- LOGIKA GRY (BEZ ZMIAN) ---
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

      if (onGameStateChangeRef.current) {
        onGameStateChangeRef.current({
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

  useEffect(() => {
    if (!roomId) return;
    if (!isHost) setStatus("Czekanie na Hosta...");

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

        if (onGameStateChangeRef.current) {
          onGameStateChangeRef.current({
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

          if (newData.status === "PLAYING" && newData.gameQueue && !currentQ) {
            setGameQueue(newData.gameQueue);
            setIsGameStarted(true);
            setCurrentRound(0);
            setStatus("Gra wystartowała!");
            if (onGameStateChangeRef.current) {
              onGameStateChangeRef.current({
                gameQueue: newData.gameQueue,
                currentRound: 0,
                status: "PLAYING",
                currentSongStart: newData.currentSongStart,
              });
            }
            if (newData.currentSongStart && newData.gameQueue[0]) {
              resolveAndPlayStream(newData.gameQueue[0].urn, newData.currentSongStart);
            }
            return;
          }

          if (newData.currentRound !== undefined && currentQ && newData.currentRound !== currentR) {
            setCurrentRound(newData.currentRound);
            if (onGameStateChangeRef.current) {
              onGameStateChangeRef.current({
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
            if (onGameFinishRef.current) onGameFinishRef.current();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]); 

  const resolveAndPlayStream = async (urn: string, serverStartTime?: string) => {
    if (playerRef.current) playerRef.current.pause();

    setStreamUrl(null); 
    setStatus("Ładowanie...");
    setCurrentSongStartTime(serverStartTime || null);

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
      }
    } catch (e) {
      console.error("Błąd audio:", e);
      setStatus("Błąd audio - czekaj na następną rundę");
    }
  };

  const handleNextRound = async () => {
    if (!isHostRef.current || !queueRef.current) return;
    const currentR = roundRef.current;
    const queue = queueRef.current;

    if (currentR + 1 >= queue.length) {
      await supabase.from("Room").update({ status: "FINISHED" }).eq("id", roomId);
      if (onGameFinishRef.current) onGameFinishRef.current();
      return;
    }

    const nextRound = currentR + 1;
    const now = new Date().toISOString();
    await supabase.from("Room").update({ currentRound: nextRound, currentSongStart: now }).eq("id", roomId);
    setCurrentRound(nextRound);
    
    if (onGameStateChangeRef.current) {
      onGameStateChangeRef.current({ currentRound: nextRound, currentSongStart: now });
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
            <p className="text-sm text-gray-400 mt-2">Host konfiguruje rozgrywkę...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between w-full text-white font-bold text-lg border-b border-gray-700 pb-2">
        <span>Runda {currentRound + 1} / {gameQueue?.length}</span>
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
                // WAŻNE: onPlay i onLoadedData wymuszają aktualną głośność
                onPlay={enforceVolume}
                onLoadedData={enforceVolume}
                onEnded={onAudioEnded}
              />
            ) : (
              <HlsPlayer 
                src={streamUrl} 
                playerRef={playerRef}
                onPlay={enforceVolume} 
                onLoadedData={enforceVolume} 
              />
            )}
            <div className="flex items-center gap-3">
              <div className="flex gap-1 h-8 items-end">
                <div className="w-1 bg-green-500 animate-[bounce_1s_infinite] h-4"></div>
                <div className="w-1 bg-green-500 animate-[bounce_1.2s_infinite] h-6"></div>
                <div className="w-1 bg-green-500 animate-[bounce_0.8s_infinite] h-3"></div>
              </div>
              <span className="text-white font-bold tracking-widest text-xl">ON AIR</span>
            </div>
            {isHost && gameQueue && gameQueue[currentRound] && (
              <div className="mt-6 p-3 bg-black/50 border border-yellow-500/50 rounded-lg text-center animate-fade-in">
                <p className="text-xs text-yellow-500/80 font-mono mb-1 uppercase tracking-widest">
                  👁️ Host Preview
                </p>
                <p className="text-yellow-300 font-bold text-lg">
                  {gameQueue[currentRound].artist} - {gameQueue[currentRound].title}
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