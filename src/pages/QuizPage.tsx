import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import HlsPlayer from "../components/HlsPlayer";

// Przykładowe ID utworu do testów (możesz je później zamienić na dynamiczne z bazy)
const TEST_TRACK_ID = "1607519955"; 

export default function QuizPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("ŁADOWANIE UTWORU...");
  
  const playerRef = useRef<HTMLVideoElement>(null);

  // --- 1. POBIERANIE LINKU PRZEZ TWÓJ BACKEND (api/stream/[trackUrn].ts) ---
  const resolveSoundCloudStream = async (trackId: string) => {
    try {
      setStatus("POBIERANIE STRUMIENIA...");
      
      // UWAGA: Ścieżka musi zawierać /api/stream/, bo tak masz ułożone foldery
      const res = await fetch(`/api/stream/${encodeURIComponent(trackId)}`);
      
      // Sprawdzamy, czy serwer nie zwrócił błędu 404/500 w formie HTML (częsty powód błędu JSON)
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        const errorText = await res.text();
        console.error("Błąd serwera:", errorText);
        throw new Error("Serwer zwrócił błąd. Sprawdź konsolę terminala.");
      }
      
      const data = await res.json();

      // Twój backend zwraca obiekt { streamUrl: "..." }
      if (data.streamUrl) {
        console.log("Strumień odebrany poprawnie!");
        return data.streamUrl;
      } else {
        throw new Error("Brak linku streamUrl w odpowiedzi API");
      }
    } catch (e: any) {
      console.error("Błąd QuizPage:", e.message);
      setStatus(`BŁĄD: ${e.message}`);
      return null;
    }
  };

  // --- 2. SYNCHRONIZACJA MUZYKI ---
  const syncMusic = (serverStartTime: string) => {
    if (!playerRef.current) return;

    const startTimeMs = new Date(serverStartTime).getTime();
    const nowMs = Date.now();
    const diffSeconds = (nowMs - startTimeMs) / 1000;

    console.log(`Synchronizacja: Utwór wystartował ${diffSeconds.toFixed(2)}s temu`);

    if (diffSeconds > 0) {
      playerRef.current.currentTime = diffSeconds;
      // Próba odtworzenia - przeglądarki często blokują autoplay bez interakcji
      playerRef.current.play().catch(e => {
        console.warn("Autoplay zablokowany. Kliknij dowolne miejsce na stronie.", e);
        setStatus("KLIKNIJ, ABY ODPROWADZIĆ DŹWIĘK 🎵");
      });
      setStatus("GRAMY! 🎵");
    }
  };

  // --- 3. GŁÓWNA LOGIKA STARTU I REALTIME ---
  useEffect(() => {
    if (!roomId) return;

    // KROK 1: Pobierz muzykę z Twojego API (omijamy CORS)
    resolveSoundCloudStream(TEST_TRACK_ID).then(url => {
        if (url) {
          setStreamUrl(url);
          // KROK 2: Połącz się z Supabase w celu synchronizacji czasu
          initGameSync();
        }
    });

    const initGameSync = async () => {
        const { data: room } = await supabase.from("Room").select("*").eq("id", roomId).single();
        if (!room) return;

        if (!room.currentSongStart) {
            // Logika dla HOSTA: Ustawia czas "zero" dla wszystkich
            const now = new Date().toISOString();
            await supabase.from("Room").update({ currentSongStart: now }).eq("id", roomId);
            syncMusic(now);
        } else {
            // Logika dla GOŚCIA: Synchronizuje się do czasu Hosta
            syncMusic(room.currentSongStart);
        }
    };

    // KROK 3: Nasłuchiwanie zmian w pokoju (np. zmiana piosenki przez Hosta)
    const channel = supabase.channel("game-updates")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Room", filter: `id=eq.${roomId}` }, (payload) => {
            const newStart = payload.new.currentSongStart;
            if (newStart) syncMusic(newStart);
        })
        .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]); 

  return (
    <div style={{ 
      background: "#111", 
      minHeight: "100vh", 
      color: "white", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      fontFamily: "Arial, sans-serif" 
    }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "30px", letterSpacing: "5px", fontWeight: "900" }}>
        GUESS THE SONG
      </h1>
      
      <div style={{ 
        padding: "25px 50px", 
        border: "2px solid #4ade80", 
        borderRadius: "50px", 
        background: "rgba(74, 222, 128, 0.1)",
        boxShadow: "0 0 20px rgba(74, 222, 128, 0.2)"
      }}>
          <h3 style={{ margin: 0, color: "#4ade80", textTransform: "uppercase" }}>
            {status}
          </h3>
      </div>

      {streamUrl && (
        <div style={{ marginTop: 40, opacity: 0, pointerEvents: "none" }}>
            {/* HlsPlayer musi być w DOM, aby audio mogło grać */}
            <HlsPlayer src={streamUrl} playerRef={playerRef} />
        </div>
      )}
      
      <button 
        onClick={() => navigate("/")} 
        style={{ 
          marginTop: "60px", 
          background: "transparent", 
          border: "1px solid #444", 
          color: "#666", 
          padding: "12px 24px", 
          borderRadius: "8px", 
          cursor: "pointer",
          transition: "0.3s"
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = "white")}
        onMouseOut={(e) => (e.currentTarget.style.color = "#666")}
      >
        Quit Game
      </button>
    </div>
  );
}