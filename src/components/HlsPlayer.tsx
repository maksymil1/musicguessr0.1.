import React, { useEffect, useRef } from "react";
import Hls, { Events } from "hls.js";

interface HlsPlayerProps {
  src: string; // Oczekujemy, że 'src' będzie zawsze stringiem
}

const HlsPlayer: React.FC<HlsPlayerProps> = ({ src }) => {
  // --- TypeScript: Typowanie 'useRef' ---
  // Ref będzie wskazywał na element <audio>, więc typujemy go jako HTMLAudioElement.
  // Inicjalizujemy go jako 'null', ponieważ element nie istnieje przy pierwszym renderowaniu.
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // --- TypeScript: Typowanie zmiennej hls ---
    // Może być instancją Hls lub null, jeśli jej nie utworzymy.
    let hls: Hls | null = null;

    if (audioRef.current && src) {
      const audioEl = audioRef.current; // Dla czytelności

      if (Hls.isSupported()) {
        hls = new Hls();

        hls.attachMedia(audioEl);

        // Ustaw nasłuch na zdarzenie MEDIA_ATTACHED
        hls.on(Events.MEDIA_ATTACHED, () => {
          if (hls) hls.loadSource(src);
        });

        // Obsługa błędów HLS
        hls.on(Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error("Fatalny błąd HLS:", data);
          } else {
            console.warn("Błąd HLS:", data);
          }
        });
      } else if (audioEl.canPlayType("application/vnd.apple.mpegurl")) {
        // Obsługa natywnego HLS (np. Safari)
        audioEl.src = src;
      }
    }

    // Funkcja czyszcząca
    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]); // Uruchom ten efekt ponownie tylko wtedy, gdy zmieni się `src`

  // Renderuj standardowy element audio.
  return <audio controls ref={audioRef} />;
};

export default HlsPlayer;
