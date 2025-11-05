import { useState, useRef, useEffect } from "react";

interface AudioToggleProps {
  trackId: number | string;
  title?: string;
  autoStopSeconds?: number;
}

export default function AudioToggle({
  trackId,
  title = "Audio",
  autoStopSeconds,
}: AudioToggleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const stopTimeout = useRef<number | null>(null);

  // update audio src when trackId changes
  useEffect(() => {
    const audio = audioRef.current;
    // clear any existing stop timeout and pause current audio
    if (stopTimeout.current) {
      window.clearTimeout(stopTimeout.current);
      stopTimeout.current = null;
    }
    if (audio) {
      audio.pause();
      setPlaying(false);
      audio.src = `/api/stream/${encodeURIComponent(String(trackId))}`;
      // reload so browser is aware of new src
      try {
        audio.load();
      } catch {
        // ignore load errors in some environments
      }
    }
    return () => {
      if (stopTimeout.current) {
        window.clearTimeout(stopTimeout.current);
        stopTimeout.current = null;
      }
    };
  }, [trackId]);

  const doPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    if (stopTimeout.current) {
      window.clearTimeout(stopTimeout.current);
      stopTimeout.current = null;
    }
  };

  const doPlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      // play() returns a promise in modern browsers
      const p = audio.play();
      if (p && typeof p.then === "function") {
        await p;
      }
      setPlaying(true);

      if (autoStopSeconds && autoStopSeconds > 0) {
        // set timeout to auto-stop
        stopTimeout.current = window.setTimeout(() => {
          doPause();
        }, autoStopSeconds * 1000);
      }
    } catch (err) {
      // autoplay / permission error
      console.error("Audio play failed:", err);
      setPlaying(false);
    }
  };

  const togglePlay = () => {
    if (playing) doPause();
    else doPlay();
  };

  // clean up on unmount
  useEffect(() => {
    return () => {
      if (stopTimeout.current) {
        window.clearTimeout(stopTimeout.current);
        stopTimeout.current = null;
      }
      const audio = audioRef.current;
      if (audio) {
        try {
          audio.pause();
        } catch {}
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <h2>{title}</h2>
      <audio
        ref={audioRef}
        src={`/api/stream/${encodeURIComponent(String(trackId))}`}
        preload="none"
      />
      <button
        onClick={togglePlay}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        {playing ? "Pause" : "Play"}
      </button>
    </div>
  );
}
