import { useEffect, useRef, useState } from "react";

export interface AudioToggleProps {
  title: string;
  /** bezpośredny URL do pliku audio (opcjonalny) */
  src?: string | null;
  /** alternatywnie: id utworu w SoundCloud — komponent zamieni to na /api/stream/{trackId} */
  trackId?: string | number | null;
  /** preload dla elementu audio */
  preload?: "auto" | "metadata" | "none";
  /** jeśli podasz liczbę (np. 5) to zatrzyma automatycznie po tylu sekundach */
  autoStopSeconds?: number | null;
  className?: string;
  /** jeśli true — spróbuje automatycznie odpalić po zmianie src */
  autoPlayOnSrcChange?: boolean;
}

export default function AudioToggle({
  title,
  src = null,
  trackId = null,
  preload = "metadata",
  autoStopSeconds = null,
  className,
  autoPlayOnSrcChange = false,
}: AudioToggleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Jeśli podano trackId, źródło to endpoint proxy na Vercelu
  const computedSrc =
    src ??
    (trackId ? `/api/stream/${encodeURIComponent(String(trackId))}` : null);

  // Format mm:ss
  const fmt = (s: number | null) => {
    if (s == null || isNaN(s)) return "--:--";
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };

  // Stop timer helper
  const clearStopTimer = () => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  // Toggle play/pause
  const handleToggle = async () => {
    setError(null);
    const audio = audioRef.current;
    if (!audio) {
      setError("Błąd: element audio niedostępny.");
      return;
    }
    if (!computedSrc) {
      setError("Brak źródła audio. Przekaż `src` lub `trackId`.");
      return;
    }

    // jeśli jeszcze nie podłączone źródło, ustaw je
    if (audio.src !== computedSrc) {
      audio.src = computedSrc;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      clearStopTimer();
      return;
    }

    try {
      const playPromise = audio.play();
      if (playPromise instanceof Promise) {
        await playPromise;
      }
      setIsPlaying(true);

      // ustaw timer auto-stop (jeśli podano)
      clearStopTimer();
      if (autoStopSeconds && autoStopSeconds > 0) {
        stopTimerRef.current = window.setTimeout(() => {
          audio.pause();
          setIsPlaying(false);
          stopTimerRef.current = null;
        }, Math.round(autoStopSeconds * 1000));
      }
    } catch (err: any) {
      console.error("Play error:", err);
      setError(
        "Nie można odtworzyć dźwięku — możliwe problemy z CORS lub nieprawidłowy URL."
      );
      setIsPlaying(false);
    }
  };

  // Event listeners: timeupdate, durationchange, ended, error
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDuration = () =>
      setDuration(isFinite(audio.duration) ? audio.duration : null);
    const onEnded = () => {
      setIsPlaying(false);
      clearStopTimer();
    };
    const onError = () =>
      setError("Błąd odtwarzania audio (sprawdź URL lub CORS).");

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When computedSrc changes -> reset player
  useEffect(() => {
    const audio = audioRef.current;
    clearStopTimer();
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(null);
    setError(null);

    // optionally auto play when source changes (if allowed)
    if (computedSrc && autoPlayOnSrcChange) {
      // small timeout to ensure src set before play
      audio.src = computedSrc;
      (async () => {
        try {
          const p = audio.play();
          if (p instanceof Promise) await p;
          setIsPlaying(true);
          if (autoStopSeconds && autoStopSeconds > 0) {
            clearStopTimer();
            stopTimerRef.current = window.setTimeout(() => {
              audio.pause();
              setIsPlaying(false);
              stopTimerRef.current = null;
            }, Math.round(autoStopSeconds * 1000));
          }
        } catch (err: any) {
          console.warn("Autoplay failed on src change:", err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedSrc]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      clearStopTimer();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  return (
    <div
      className={className}
      style={{
        border: "1px solid #e0e0e0",
        padding: 12,
        borderRadius: 8,
        maxWidth: 420,
        fontFamily: "system-ui,Segoe UI,Roboto,Arial",
      }}
    >
      <div style={{ marginBottom: 8, fontWeight: 600 }}>{title}</div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={handleToggle}
          aria-pressed={isPlaying}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "none",
            background: isPlaying ? "#ef4444" : "#10b981",
            color: "white",
            cursor: "pointer",
            boxShadow: "rgba(0,0,0,0.08) 0 1px 2px",
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <div style={{ fontSize: 13, color: "#444" }}>
          {fmt(currentTime)} / {fmt(duration)}
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      )}

      <audio ref={audioRef} preload={preload} style={{ display: "none" }} />
    </div>
  );
}
