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
  // Volume context values
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

  // --- DEBUGGING ---
  useEffect(() => {
    console.log("🔊 Volume Check:", { volume, isMuted });
  }, [volume, isMuted]);

  // --- FIXED VOLUME AND MUTE SYNC (Effective Volume 0%) ---
  useEffect(() => {
    if (playerRef.current) {
      // Logic: If muted, set volume to 0. Otherwise, use slider value.
      // We keep native .muted as false to prevent browser autoplay blocks.
      playerRef.current.muted = false; 
      playerRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted, streamUrl]);

  useEffect(() => {
    queueRef.current = gameQueue;
  }, [gameQueue]);
  useEffect(() => {
    roundRef.current = currentRound;
  }, [currentRound]);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // --- TIMER LOGIC ---
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

  // --- START GAME (HOST) ---
  const handleStartGame = async () => {
    if (!isHost) return;
    if (!inputValue && mode !== "genre" && !initialQuery) return;

    setIsLoading(true);
    setStatus("FETCHING...");

    try {
      const query = initialQuery || inputValue;
      const res = await fetch(
        `/api/game/start?mode=${mode}&query=${encodeURIComponent(query)}`,
      );

      if (!res.ok) throw new Error("API Error");
      const tracks: GameTrack[] = await res.json();

      if (!tracks || tracks.length === 0) throw new Error("No tracks found.");

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
      setStatus("STARTING");
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
      setStatus(`ERROR: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    if (!isHost) setStatus("WAITING...");

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
      setStatus("FINISHED");
      setStreamUrl(null);
      onGameFinish();
    }
  };

  const resolveAndPlayStream = async (
    track: GameTrack,
    serverStartTime?: string,
  ) => {
    setStreamUrl(null);
    setStatus("Loading...");

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
            // Apply effective volume settings immediately upon start
            playerRef.current.muted = false;
            playerRef.current.volume = isMuted ? 0 : volume / 100;

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
      console.error("Audio Error:", e);
      setStatus("AUDIO ERROR");
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
                placeholder="Paste link here..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            {mode === "artist" && !initialQuery && (
              <input
                className="p-3 rounded bg-black border border-green-500 text-white w-full focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Enter artist e.g. Tame Impala..."
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
              {isLoading ? "FETCHING..." : "START GAME"}
            </button>
            {status && <p className="text-yellow-400 text-sm mt-2">{status}</p>}
          </div>
        ) : (
          <div className="text-white text-center quiz-card">
            <div className="loading-spinner mx-auto"></div>
            <p className="text-xl font-bold">WAITING FOR HOST</p>
            <p className="text-sm text-gray-400 mt-2">
              The host is setting up the game...
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
          ROUND <span style={{ color: "#4ade80" }}>{currentRound + 1}</span> /{" "}
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
                muted={false} // Force false to control via effective volume
                controls={false}
                autoPlay
                onEnded={onAudioEnded}
              />
            ) : (
              <HlsPlayer 
                src={streamUrl} 
                playerRef={playerRef} 
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
                <div className="eq-bar"></div>
              </div>
              <span className="on-air-text">ON AIR</span>
            </div>
          </>
        ) : (
          <>
            <div className="loading-spinner"></div>
            <p className="text-gray-400 text-sm">SYNCING...</p>
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