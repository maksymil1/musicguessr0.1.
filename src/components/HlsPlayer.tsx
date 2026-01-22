import { useEffect, useRef, memo } from "react";
import Hls from "hls.js";

// Rozszerzamy interfejs o standardowe propsy znacznika audio (np. onPlay, onLoadedData)
interface HlsPlayerProps extends React.AudioHTMLAttributes<HTMLAudioElement> {
  src: string;
  playerRef: React.RefObject<HTMLAudioElement | null>;
}

function HlsPlayer({ src, playerRef, ...props }: HlsPlayerProps) {
  const internalRef = useRef<HTMLAudioElement>(null);
  const audioRef = playerRef || internalRef;

  useEffect(() => {
    const audio = audioRef.current as HTMLAudioElement;
    if (!audio) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Próba autostartu
        audio.play().catch((e) => console.log("HLS Autoplay blocked:", e));
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("HLS Fatal Error:", data);
        }
      });
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      // Fallback Safari
      audio.src = src;
      audio.addEventListener("loadedmetadata", () => {
        audio.play().catch((e) => console.log("Safari Autoplay blocked:", e));
      });
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, audioRef]);

  return (
    <audio
      ref={audioRef}
      style={{ display: "none" }}
      controls={false}
      {...props} // <--- TO JEST KLUCZOWE: Przekazujemy onPlay i onLoadedData dalej
    />
  );
}

export default memo(HlsPlayer);