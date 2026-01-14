import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import HlsPlayer from "../components/HlsPlayer";

// Klucz SoundCloud
const SC_CLIENT_ID = "MYGy7K3hK1ZIduBISIOJee7TfiZ6vaQO";

// ZMIANA: Inne ID utworu (często te bardzo znane są blokowane, ten powinien działać)
const TEST_TRACK_ID = "192383803"; 

export default function QuizPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("LOADING TRACK...");
  
  const playerRef = useRef<HTMLVideoElement>(null);

  // --- 1. Pobieranie linku z SoundCloud ---
  const resolveSoundCloudStream = async (trackId: string) => {
    try {
      const trackRes = await fetch(`https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${SC_CLIENT_ID}`);
      if (!trackRes.ok) throw new Error("Track not found or blocked");
      
      const trackData = await trackRes.json();
      
      const transcoding = trackData.media.transcodings.find((t: any) => 
        t.format.protocol === "hls" && (t.format.mime_type.includes("mpeg") || t.format.mime_type.includes("mp4"))
      );
      
      if (!transcoding) throw new Error("No HLS stream found");

      const urlRes = await fetch(`${transcoding.url}?client_id=${SC_CLIENT_ID}`);
      const urlData = await urlRes.json();
      return urlData.url;
    } catch (e) {
      console.error("SoundCloud Error:", e);
      setStatus("ERROR: SC BLOCKED (CHECK CONSOLE)");
      return null;
    }
  };

  // --- 2. Synchronizacja Muzyki ---
  const syncMusic = (serverStartTime: string) => {
    if (!playerRef.current) return;

    const startTimeMs = new Date(serverStartTime).getTime();
    const nowMs = Date.now();
    const diffSeconds = (nowMs - startTimeMs) / 1000;

    console.log(`Syncing... Music started ${diffSeconds}s ago`);

    if (diffSeconds > 0) {
      playerRef.current.currentTime = diffSeconds;
      playerRef.current.play().catch(e => console.log("Autoplay blocked (kliknij w stronę):", e));
      setStatus("PLAYING 🎵");
    }
  };

  // --- 3. Główna Logika ---
  useEffect(() => {
    if (!roomId) return;

    // A. Pobierz muzykę
    resolveSoundCloudStream(TEST_TRACK_ID).then(url => {
        if (url) setStreamUrl(url);
    });

    // B. Logika startu gry
    const initGame = async () => {
        const { data: room } = await supabase.from("Room").select("*").eq("id", roomId).single();
        
        if (!room) return;

        if (!room.currentSongStart) {
            // Jeśli czas startu nie jest ustawiony -> Host ustawia go TERAZ
            // Ale tylko jeśli mamy już URL muzyki, żeby nie wystartować ciszy
            const now = new Date().toISOString();
            await supabase.from("Room").update({ currentSongStart: now }).eq("id", roomId);
            if(streamUrl) syncMusic(now);
        } else {
            // Dołączam do trwającej gry
            if(streamUrl) syncMusic(room.currentSongStart);
        }
    };

    setTimeout(initGame, 1000);

    // C. Nasłuchiwanie
    const channel = supabase.channel("game-sync")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Room", filter: `id=eq.${roomId}` }, (payload) => {
            const newStart = payload.new.currentSongStart;
            if (newStart) {
                syncMusic(newStart);
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, streamUrl]); 

  return (
    <div style={{ background: "#222", minHeight: "100vh", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>GUESS THE SONG</h1>
      
      <div style={{ padding: "20px", border: "2px solid #4ade80", borderRadius: "15px", background: "rgba(0,0,0,0.5)" }}>
          <h3 style={{ margin: 0, color: "#4ade80" }}>STATUS: {status}</h3>
      </div>

      {streamUrl && (
        <div style={{ marginTop: 40, opacity: 0.8 }}>
            <HlsPlayer 
                src={streamUrl} 
                playerRef={playerRef} 
            />
        </div>
      )}
      
      <button onClick={() => navigate("/")} style={{ marginTop: "50px", background: "transparent", border: "1px solid #666", color: "#888", padding: "10px", cursor: "pointer" }}>
        Quit Game
      </button>
    </div>
  );
}