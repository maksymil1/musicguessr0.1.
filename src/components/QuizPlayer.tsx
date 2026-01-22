import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useVolume } from "../context/VolumeContext"; 
import HlsPlayer from "./HlsPlayer";
import type { GameTrack, GameMode } from "../types/types";
import "./QuizPlayer.css";

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
  // UWAGA: Upewnij się, że w VolumeContext zmienna nazywa się 'isMuted'. 
  // Jeśli nazywa się 'mute' lub 'muted', zmień poniższą linijkę np. na: const { volume, mute: isMuted } = useVolume();
  const { volume, isMuted } = useVolume(); 

  const playerRef = useRef<HTMLAudioElement>(null);

  const queueRef = useRef<GameTrack[] | null>(null);
  const roundRef = useRef(0);
  const isHostRef = useRef(isHost);
  const hasSyncedRef = useRef(false);

  const songStartRef = useRef<string | null>(null);

  const [inputValue, setInputValue] = useState("");
  const [gameQueue, setGameQueue] = useState<GameTrack[] | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isItunesSource, setIsItunesSource] = useState(false);
  const [status, setStatus] = useState("");
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [timeLeft, setTimeLeft] = useState(30.0);

  // --- DEBUGOWANIE ---
  useEffect(() => {
    // Sprawdź w konsoli (F12), czy te wartości się zmieniają, gdy klikasz w ustawieniach
    console.log("🔊 Volume Check:", { volume, isMuted });
  }, [volume, isMuted]);

  // --- NAPRAWIONA SYNCHRONIZACJA GŁOŚNOŚCI I WYCISZENIA ---
  useEffect(() => {
    if (playerRef.current) {
      // 1. Najpierw ustawiamy flagę muted (to ważniejsze dla całkowitego wyciszenia)
      playerRef.current.muted = !!isMuted; // Wymuszamy boolean (!!), żeby uniknąć undefined
      
      // 2. Potem ustawiamy głośność (na wypadek gdyby użytkownik odmutował)
      // Jeśli jest wyciszony, volume na suwaku i tak nie ma znaczenia dla ucha, 
      // ale HTML Audio lubi mieć spójne dane.
      playerRef.current.volume = volume / 100;
    }
  }, [volume, isMuted, streamUrl]); // Odpala się przy każdej zmianie

  useEffect(() => {
    queueRef.current = gameQueue;
  }, [gameQueue]);
  useEffect(() => {
    roundRef.current = currentRound;
  }, [currentRound]);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // --- LOGIKA TIMERA ---
  useEffect(() => {
    if (!streamUrl || !isGameStarted) return;

    const syncTime = () => {
      if (songStartRef.current) {
        const serverStart = new Date(songStartRef.current).getTime();
        const now = Date.now();
        const elapsed = (now - serverStart) / 1000;

        if (elapsed >= 0 && elapsed < 30) {
          setTimeLeft(30 - elapsed);
        } else {
          setTimeLeft(30);
        }
      } else {
        setTimeLeft(30);
      }
    };
    syncTime();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newVal = prev - 0.1;
        if (newVal <= 0) return 0;
        return newVal;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [streamUrl, isGameStarted]);

  // --- START GRY (HOST) ---
  const handleStartGame = async () => {
    if (!isHost) return;
    if (!inputValue && mode !== "genre" && !initialQuery) return;

    setIsLoading(true);
    setStatus("POBIERANIE...");

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
      setStatus("START");
      songStartRef.current = now;

      if (onGameStateChange) {
        onGameStateChange({
          gameQueue: tracks,
          currentRound: 0,
          status: "PLAYING",
          currentSongStart: now,
        });
      }

      resolveAndPlayStream(tracks[0], now);
    } catch (e: any) {
      console.error(e);
      setStatus(`BŁĄD: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    if (!isHost) setStatus("OCZEKIWANIE...");

    const fetchInitialState = async () => {
      const { data } = await supabase
        .from("Room")
        .select("*")
        .eq("id", roomId)
        .single();
      if (data?.status === "PLAYING" && data.gameQueue) {
        handleNewState(data);
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
        (payload) => handleNewState(payload.new),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const handleNewState = (newData: any) => {
    const currentQ = queueRef.current;
    const currentR = roundRef.current;

    if (newData.currentSongStart) {
      songStartRef.current = newData.currentSongStart;
    }

    if (
      newData.status === "PLAYING" &&
      newData.gameQueue &&
      (!currentQ || newData.currentRound === 0)
    ) {
      setGameQueue(newData.gameQueue);
      setIsGameStarted(true);
      setCurrentRound(0);
      setStatus("");

      if (onGameStateChange && !hasSyncedRef.current) {
        hasSyncedRef.current = true;
        onGameStateChange(newData);
      }

      if (newData.currentSongStart && newData.gameQueue[0]) {
        resolveAndPlayStream(newData.gameQueue[0], newData.currentSongStart);
      }
    } else if (
      newData.currentRound !== undefined &&
      currentQ &&
      newData.currentRound !== currentR
    ) {
      setCurrentRound(newData.currentRound);

      if (onGameStateChange) onGameStateChange(newData);

      const track = currentQ[newData.currentRound];
      if (track && newData.currentSongStart) {
        resolveAndPlayStream(track, newData.currentSongStart);
      }
    }

    if (newData.status === "FINISHED") {
      setStatus("KONIEC");
      setStreamUrl(null);
      onGameFinish();
    }
  };

  const resolveAndPlayStream = async (
    track: GameTrack,
    serverStartTime?: string,
  ) => {
    setStreamUrl(null);
    setStatus("Ładowanie...");

    try {
      let finalUrl = "";

      if (track.source === "itunes" || track.urn.startsWith("http")) {
        setIsItunesSource(true);
        finalUrl = track.urn;
      } else {
        setIsItunesSource(false);
        const res = await fetch(`/api/stream/${encodeURIComponent(track.urn)}`);
        const data = await res.json();
        if (data.streamUrl) finalUrl = data.streamUrl;
      }

      if (finalUrl) {
        setStreamUrl(finalUrl);
        setStatus("");

        setTimeout(() => {
          if (serverStartTime && playerRef.current) {
            // Aplikujemy ustawienia dźwięku również przy starcie
            playerRef.current.muted = !!isMuted;
            playerRef.current.volume = volume / 100;

            const startTimeMs = new Date(serverStartTime).getTime();
            const nowMs = Date.now();
            const diffSec = (nowMs - startTimeMs) / 1000;

            if (diffSec > 0 && diffSec < 29) {
              playerRef.current.currentTime = diffSec;
            } else {
              playerRef.current.currentTime = 0;
            }

            playerRef.current.play().catch(() => {});
          }
        }, 200);
      }
    } catch (e) {
      console.error("Błąd audio:", e);
      setStatus("BŁĄD AUDIO");
    }
  };

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
      .update({
        currentRound: nextRound,
        currentSongStart: now,
      })
      .eq("id", roomId);
  };

  const onAudioEnded = () => {
    if (isHostRef.current) handleNextRound();
  };

  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center gap-4 mt-10 w-full max-w-md mx-auto animate-fade-in p-4">
        {isHost ? (
          <div className="flex flex-col gap-3 w-full items-center quiz-card">
            {mode === "playlist" && !initialQuery && (
              <input
                className="p-3 rounded bg-black border border-green-500 text-white w-full focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Wklej link..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            {mode === "artist" && !initialQuery && (
              <input
                className="p-3 rounded bg-black border border-green-500 text-white w-full focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Wpisz np. Tame Impala..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            <button
              onClick={handleStartGame}
              disabled={isLoading}
              className="skip-button mt-4 bg-green-600 hover:bg-green-500 text-white"
              style={{
                background: "#4ade80",
                color: "black",
                borderColor: "#4ade80",
              }}
            >
              {isLoading ? "POBIERANIE..." : "START GAME"}
            </button>
            {status && <p className="text-yellow-400 text-sm mt-2">{status}</p>}
          </div>
        ) : (
          <div className="text-white text-center quiz-card">
            <div className="loading-spinner mx-auto"></div>
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
    <div className="quiz-card animate-fade-in">
      <div className="quiz-header">
        <div className="round-info">
          RUNDA <span style={{ color: "#4ade80" }}>{currentRound + 1}</span> /{" "}
          {gameQueue?.length}
        </div>
        <div className="game-status">{status}</div>
      </div>

      {streamUrl && (
        <div className="timer-container">
          <div className="timer-labels">
            <span
              className={`timer-text-display ${timeLeft < 10 ? "timer-text-critical" : ""}`}
            >
              {timeLeft.toFixed(1)}s
            </span>
          </div>
          <div className="timer-track">
            <div
              className={`timer-fill ${timeLeft < 10 ? "critical" : ""}`}
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="player-visualizer">
        {streamUrl ? (
          <>
            {isItunesSource ? (
              <audio
                ref={playerRef}
                src={streamUrl}
                muted={!!isMuted} // <--- KLUCZOWA ZMIANA (Prop)
                controls={false}
                autoPlay
                onEnded={onAudioEnded}
              />
            ) : (
              <HlsPlayer 
                src={streamUrl} 
                playerRef={playerRef} 
                muted={!!isMuted} // <--- KLUCZOWA ZMIANA (Przekazujemy do HLS)
              />
            )}

            <div className="music-pulse">
              <span className="music-icon">🎵</span>
            </div>

            <div className="on-air-container">
              <div className="eq-bars">
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
              </div>
              <span className="on-air-text">ON AIR</span>
            </div>
          </>
        ) : (
          <>
            <div className="loading-spinner"></div>
            <p className="text-gray-400 text-sm">SYNCHRONIZACJA...</p>
          </>
        )}
      </div>

      {isHost && (
        <button onClick={handleNextRound} className="skip-button">
          SKIP ROUND ⏭
        </button>
      )}
    </div>
  );
}