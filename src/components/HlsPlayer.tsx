import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  // Tutaj mówimy komponentowi: "Możesz dostać pilota (ref) od rodzica"
  playerRef?: React.RefObject<HTMLVideoElement | null>; 
}

export default function HlsPlayer({ src, playerRef }: HlsPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  
  // Używamy tego refa, którego dał rodzic (QuizPage), a jak nie dał, to własnego
  const videoRef = playerRef || internalRef; 

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
  }, [src, videoRef]);

  return (
    <video 
        ref={videoRef as React.LegacyRef<HTMLVideoElement>} 
        controls={false} // Ukrywamy, bo gra steruje sama
        style={{ width: "100%", maxWidth: "500px", borderRadius: "10px" }} 
    />
  );
}