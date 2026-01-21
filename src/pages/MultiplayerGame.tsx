import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

// Komponenty
import QuizPlayer from "../components/QuizPlayer";
import GameModes from "./GameModes/GameModes";
import Genres from "./GameModes/Genres";
import ChatWindow from "../components/ChatWindow";

// Typy i Style
import type { GameMode, GameTrack } from "../types/types";
import "../pages/home.css";

export default function MultiplayerGame() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  if (!roomId) {
    return <Navigate to="/" replace />;
  }

  const myNickname = localStorage.getItem("myNickname") || "Anon";
  const myPlayerId = localStorage.getItem("myPlayerId");

  const [isHost, setIsHost] = useState(false);

  const [roomState, setRoomState] = useState<{
    status: "WAITING" | "PLAYING" | "FINISHED";
    gameMode: GameMode | null;
    gameQuery: string | null;
    gameQueue: GameTrack[] | null;
    currentRound: number;
    currentSongStart: string | null;
  }>({
    status: "WAITING",
    gameMode: null,
    gameQuery: null,
    gameQueue: null,
    currentRound: 0,
    currentSongStart: null,
  });

  const [players, setPlayers] = useState<any[]>([]);
  const [hostStep, setHostStep] = useState<"MODES" | "GENRES">("MODES");

  // --- 1. FUNKCJA POBIERANIA GRACZY (STABILNA) ---
  const fetchPlayers = useCallback(async () => {
    // Pobieramy graczy BEZ logowania co sekundę
    const { data } = await supabase
      .from("Player")
      .select("*")
      .eq("roomId", roomId)
      .order("score", { ascending: false });

    if (data) {
      // Aktualizujemy stan TYLKO jeśli dane są inne, żeby nie powodować pętli
      setPlayers((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(data)) {
          console.log("Aktualizacja tabeli wyników:", data);
          return data;
        }
        return prev;
      });
    }
  }, [roomId]);

  // --- 2. INICJALIZACJA I REALTIME ---
  useEffect(() => {
    if (!roomId) return;

    // A. Sprawdź Hosta
    const checkHost = async () => {
      const { data } = await supabase
        .from("Player")
        .select("isHost")
        .eq("id", myPlayerId)
        .single();
      if (data?.isHost) setIsHost(true);
    };
    checkHost();

    // B. Pobierz stan pokoju
    const fetchRoomState = async () => {
      const { data } = await supabase
        .from("Room")
        .select("*")
        .eq("id", roomId)
        .single();
      if (data) {
        setRoomState({
          status: data.status,
          gameMode: data.gameMode as GameMode,
          gameQuery: data.gameQuery,
          gameQueue: data.gameQueue,
          currentRound: data.currentRound,
          currentSongStart: data.currentSongStart,
        });
      }
    };
    fetchRoomState();
    fetchPlayers();

    // C. Subskrypcja
    const channel = supabase
      .channel(`multiplayer-game-${roomId}`)
      // Słuchamy zmian w ROOM
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
          setRoomState((prev) => ({
            ...prev,
            status: newData.status,
            gameMode: newData.gameMode,
            gameQuery: newData.gameQuery,
            gameQueue: newData.gameQueue,
            currentRound: newData.currentRound,
            currentSongStart: newData.currentSongStart,
          }));
        },
      )
      // Słuchamy zmian w PLAYER (punkty)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Player",
          filter: `roomId=eq.${roomId}`,
        },
        (payload) => {
          console.log("Wykryto zmianę punktów u gracza:", payload.new);
          fetchPlayers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, myPlayerId, fetchPlayers]); // Dodane fetchPlayers do deps (jest bezpieczne dzięki useCallback)

  // --- 3. WYMUSZENIE ODŚWIEŻENIA NA KONIEC ---
  // Używamy useRef, żeby sprawdzić czy już odświeżyliśmy, aby uniknąć pętli
  const finishedRef = useRef(false);

  useEffect(() => {
    if (roomState.status === "FINISHED" && !finishedRef.current) {
      console.log("Gra zakończona - pobieram finalne wyniki.");
      finishedRef.current = true; // Zapobiegamy pętli

      // Pobierz raz
      fetchPlayers();

      // Pobierz drugi raz po chwili (dla pewności)
      setTimeout(() => {
        fetchPlayers();
      }, 1000);
    } else if (roomState.status !== "FINISHED") {
      finishedRef.current = false;
    }
  }, [roomState.status, fetchPlayers]);

  // --- LOGIKA STEROWANIA ---
  const handleHostSelectMode = (mode: GameMode) => {
    if (mode === "genre") setHostStep("GENRES");
    else updateRoomSetup(mode, "");
  };

  const handleHostSelectGenre = (_playlistUrn: string, label: string) => {
    updateRoomSetup("genre", label);
  };

  const updateRoomSetup = async (mode: GameMode, query: string) => {
    setRoomState((prev) => ({
      ...prev,
      gameMode: mode,
      gameQuery: query,
      status: prev.status === "FINISHED" ? "WAITING" : prev.status,
    }));
    await supabase
      .from("Room")
      .update({ gameMode: mode, gameQuery: query })
      .eq("id", roomId);
  };

  const handleLocalStateUpdate = (updates: Partial<typeof roomState>) => {
    setRoomState((prev) => ({ ...prev, ...updates }));
  };

  const handleGameFinish = () => {
    setRoomState((prev) => ({ ...prev, status: "FINISHED" }));
    // Host wymusza update bazy
    supabase.from("Room").update({ status: "FINISHED" }).eq("id", roomId);
  };

  const handleRestartGame = async () => {
    await supabase.from("Player").update({ score: 0 }).eq("roomId", roomId);
    await supabase
      .from("Room")
      .update({
        status: "WAITING",
        gameMode: null,
        gameQueue: null,
        currentRound: 0,
        currentSongStart: null,
      })
      .eq("id", roomId);
    setHostStep("MODES");
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 }))); // Reset lokalny
  };

  const handleCloseRoom = async () => {
    await supabase.from("Room").delete().eq("id", roomId);
    navigate("/");
  };

  // --- RENDEROWANIE ---
  const isGameActive = !!roomState.gameMode && roomState.status !== "FINISHED";

  const currentTrack =
    roomState.gameQueue && roomState.gameQueue[roomState.currentRound]
      ? {
          title: roomState.gameQueue[roomState.currentRound].title,
          artist: roomState.gameQueue[roomState.currentRound].artist,
        }
      : null;

  const renderLeftColumn = () => {
    if (roomState.status === "FINISHED") {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full text-white animate-fade-in">
          <h1 className="text-5xl font-bold text-yellow-400 mb-8 neon-text">
            GAME OVER
          </h1>
          <div className="bg-gray-900/80 p-6 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl mb-8 overflow-y-auto max-h-[400px]">
            <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 text-center">
              RANKING
            </h3>
            {players.length > 0 ? (
              players.map((p, index) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-3 border-b border-gray-800 last:border-0 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold text-xl w-8 ${index === 0 ? "text-yellow-400" : "text-gray-300"}`}
                    >
                      #{index + 1}
                    </span>
                    <span className="text-lg">{p.nickname}</span>
                    {p.isHost && <span>👑</span>}
                  </div>
                  <span className="text-green-400 font-mono text-xl font-bold">
                    {p.score || 0} pkt
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">Ładowanie wyników...</p>
            )}
          </div>
          {isHost ? (
            <div className="flex gap-4">
              <button
                onClick={handleRestartGame}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition active:scale-95"
              >
                RESTART 🔄
              </button>
              <button
                onClick={handleCloseRoom}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition active:scale-95"
              >
                CLOSE ❌
              </button>
            </div>
          ) : (
            <p className="text-gray-400 animate-pulse">Czekanie na Hosta...</p>
          )}
        </div>
      );
    }

    if (isGameActive) {
      return (
        <QuizPlayer
          mode={roomState.gameMode!}
          roomId={roomId!}
          isHost={isHost}
          initialQuery={roomState.gameQuery || undefined}
          onGameFinish={handleGameFinish}
          onGameStateChange={handleLocalStateUpdate}
        />
      );
    }

    if (isHost) {
      return hostStep === "GENRES" ? (
        <div className="w-full flex flex-col items-center">
          <button
            onClick={() => setHostStep("MODES")}
            className="self-start mb-4 text-gray-400 hover:text-white underline"
          >
            ← Wróć
          </button>
          <Genres onGenreSelect={handleHostSelectGenre} />
        </div>
      ) : (
        <GameModes onModeSelect={handleHostSelectMode} />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-white h-full">
        <div className="animate-spin h-16 w-16 border-4 border-green-500 rounded-full border-t-transparent mb-6"></div>
        <h2 className="text-3xl font-bold tracking-widest">OCZEKIWANIE...</h2>
      </div>
    );
  };

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
          maxWidth:
            isGameActive || roomState.status === "FINISHED"
              ? "1400px"
              : "800px",
          margin: "0 auto",
          height: "100%",
          padding: "20px",
          gap: "20px",
          justifyContent:
            isGameActive || roomState.status === "FINISHED"
              ? "flex-start"
              : "center",
          transition: "max-width 0.5s ease",
        }}
      >
        <div
          style={{
            flex: isGameActive || roomState.status === "FINISHED" ? 3 : 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
            minWidth: 0,
          }}
        >
          {renderLeftColumn()}
        </div>
        {(isGameActive || roomState.status === "FINISHED") && (
          <div
            style={{
              flex: 1,
              minWidth: "300px",
              maxWidth: "400px",
              height: "100%",
            }}
          >
            <ChatWindow
              roomId={roomId}
              nickname={myNickname}
              currentTrack={currentTrack}
              roundStartTime={roomState.currentSongStart}
            />
          </div>
        )}
      </div>
    </div>
  );
}
