import { useEffect, useRef, memo } from "react";
import Hls from "hls.js";

// Rozszerzamy standardowe atrybuty audio, aby przyjmować onPlay, onEnded itp.
interface HlsPlayerProps extends React.AudioHTMLAttributes<HTMLAudioElement> {
  src: string;
  // Opcjonalny, bo tworzymy wewnętrzny fallback, jeśli rodzic nie poda refa
  playerRef?: React.RefObject<HTMLAudioElement | null>;
}

function HlsPlayer({ src, playerRef, ...props }: HlsPlayerProps) {
  const internalRef = useRef<HTMLAudioElement>(null);
  // Używamy refa przekazanego przez rodzica (QuizPlayer) lub własnego
  const ref = playerRef || internalRef;

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Próba autostartu
        audio.play().catch((e) => {
          // Ignorujemy AbortError (częste przy szybkim przełączaniu rund)
          if (e.name !== 'AbortError') {
             console.log("HLS Autoplay blocked:", e);
          }
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn("HLS Fatal Error:", data);
          // Można tu dodać logikę hls.recoverMediaError(), ale destroy wystarczy do resetu
        }
      });
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      // Fallback dla Safari (natywne HLS)
      audio.src = src;
      audio.addEventListener("loadedmetadata", () => {
        audio.play().catch(() => {});
      });
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, ref]);

  return (
    <audio
      ref={ref}
      style={{ display: "none" }} // Ukryty, bo QuizPlayer ma własny visualizer
      controls={false}
      playsInline // Ważne dla iOS (zapobiega fullscreenowi)
      {...props} // <--- TO JEST KLUCZOWE: Przekazuje onPlay, onLoadedData (głośność) i onEnded (zmiana rundy)
    />
  );
}

export default memo(HlsPlayer);