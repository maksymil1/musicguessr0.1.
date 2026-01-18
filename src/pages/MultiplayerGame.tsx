import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import QuizPlayer from "../components/QuizPlayer";
import GameModes from "./GameModes/GameModes";
import Genres from "./GameModes/Genres";
import ChatWindow from "../components/ChatWindow";
import type { GameMode } from "../types/types";
import "../pages/home.css";

export default function MultiplayerGame() {
  const { roomId } = useParams();

  if (!roomId) {
    return <Navigate to="/" replace />;
  }

  const myNickname = localStorage.getItem("myNickname") || "Anon";
  const myPlayerId = localStorage.getItem("myPlayerId");

  const [isHost, setIsHost] = useState(false);

  const [roomState, setRoomState] = useState<{
    gameMode: GameMode | null;
    gameQuery: string | null;
  }>({ gameMode: null, gameQuery: null });

  const [hostStep, setHostStep] = useState<"MODES" | "GENRES">("MODES");

  useEffect(() => {
    if (!roomId) return;

    const checkHost = async () => {
      const { data } = await supabase
        .from("Player")
        .select("isHost")
        .eq("id", myPlayerId)
        .single();
      if (data?.isHost) setIsHost(true);
    };
    checkHost();

    const fetchRoomState = async () => {
      const { data } = await supabase
        .from("Room")
        .select("gameMode, gameQuery")
        .eq("id", roomId)
        .single();
      if (data)
        setRoomState({
          gameMode: data.gameMode as GameMode,
          gameQuery: data.gameQuery,
        });
    };
    fetchRoomState();

    const channel = supabase
      .channel(`game-state-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Room",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newData = payload.new;
          if (newData.gameMode) {
            setRoomState({
              gameMode: newData.gameMode,
              gameQuery: newData.gameQuery,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, myPlayerId]);

  // LOGIKA HOSTA
  const handleHostSelectMode = (mode: GameMode) => {
    if (mode === "genre") {
      setHostStep("GENRES");
    } else {
      updateRoomAndStart(mode, "");
    }
  };

  const handleHostSelectGenre = (playlistUrn: string) => {
    updateRoomAndStart("genre", playlistUrn);
  };

  const updateRoomAndStart = async (mode: GameMode, query: string) => {
    await supabase
      .from("Room")
      .update({ gameMode: mode, gameQuery: query })
      .eq("id", roomId);
  };

  // --- HELPER: CZY GRA JUŻ TRWA? ---
  // Jeśli roomState.gameMode jest ustawione, to znaczy że Host wybrał tryb i gramy.
  const isGameActive = !!roomState.gameMode;

  // --- RENDEROWANIE TREŚCI GRY (Lewa strona) ---
  const renderGameContent = () => {
    // 1. Gra trwa -> QuizPlayer
    if (isGameActive) {
      return (
        <QuizPlayer
          mode={roomState.gameMode!}
          roomId={roomId}
          isHost={isHost}
          initialQuery={roomState.gameQuery || undefined}
        />
      );
    }

    // 2. Host wybiera -> Menu
    if (isHost) {
      if (hostStep === "GENRES") {
        return (
          <div className="w-full flex flex-col items-center">
            <button
              onClick={() => setHostStep("MODES")}
              className="mb-4 text-white underline self-start"
            >
              ← Wróć
            </button>
            <Genres onGenreSelect={handleHostSelectGenre} />
          </div>
        );
      }
      return <GameModes onModeSelect={handleHostSelectMode} />;
    }

    // 3. Gość czeka
    return (
      <div className="flex flex-col items-center justify-center text-white">
        <div className="animate-spin h-10 w-10 border-4 border-green-500 rounded-full border-t-transparent mb-4"></div>
        <h2 className="text-2xl font-bold">OCZEKIWANIE NA HOSTA...</h2>
        <p className="text-gray-400">Host wybiera tryb gry.</p>
      </div>
    );
  };

  // --- GŁÓWNY LAYOUT ---
  return (
    <div
      className="master"
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          // Jeśli gra trwa: szeroko (na czat), jeśli menu: węziej (żeby ładnie wyglądało)
          maxWidth: isGameActive ? "1200px" : "800px",
          margin: "0 auto",
          height: "100%",
          padding: "20px",
          gap: "20px",
          // Jeśli menu (brak czatu), wyśrodkuj zawartość
          justifyContent: isGameActive ? "flex-start" : "center",
        }}
      >
        {/* LEWA KOLUMNA - GRA / MENU */}
        <div
          style={{
            // Jeśli gra trwa: flex 3 (70%), jeśli menu: flex 1 (100% szerokości kontenera)
            flex: isGameActive ? 3 : 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {renderGameContent()}
        </div>

        {/* PRAWA KOLUMNA - CZAT (Tylko gdy gra jest aktywna) */}
        {isGameActive && (
          <div style={{ flex: 1, minWidth: "300px", height: "100%" }}>
            <ChatWindow roomId={roomId} nickname={myNickname} />
          </div>
        )}
      </div>
    </div>
  );
}
