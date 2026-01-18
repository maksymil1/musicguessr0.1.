import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface HlsPlayerProps {
  src: string;
  playerRef?: React.RefObject<HTMLAudioElement | null>; // Zmieniamy typ na Audio
}

export default function HlsPlayer({ src, playerRef }: HlsPlayerProps) {
  // Jeśli rodzic nie podał refa, używamy wewnętrznego (fallback)
  const internalRef = useRef<HTMLAudioElement>(null);
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
        audio.play().catch((e) => console.log("Autoplay blocked:", e));
      });
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      // Fallback dla Safari (iOS)
      audio.src = src;
      audio.play();
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, ref]);

  return (
    // Używamy <audio> zamiast <video>
    // style={{ display: 'none' }} ukrywa odtwarzacz całkowicie (muzyka gra w tle)
    // Jeśli chcesz widzieć pasek postępu, usuń display: none i dodaj controls
    // <audio ref={ref} style={{ display: "none" }} controls={false} />
    <audio ref={ref} controls={true} autoPlay={true} />
  );
}