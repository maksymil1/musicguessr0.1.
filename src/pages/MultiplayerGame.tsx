import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

// Komponenty
import QuizPlayer from "../components/QuizPlayer";
import GameModes from "./GameModes/GameModes";
import Genres from "./GameModes/Genres";
import ChatWindow from "../components/ChatWindow";
import Settings from "../components/Settings"; // <--- Upewnij się, że ścieżka importu jest poprawna

// Typy i Style
import type { GameMode, GameTrack } from "../types/types";
import "../pages/home.css";

export default function MultiplayerGame() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  if (!roomId) return <Navigate to="/" replace />;

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

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from("Player")
      .select("*")
      .eq("roomId", roomId)
      .order("score", { ascending: false });

    if (data) {
      setPlayers((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
        return prev;
      });
    }
  }, [roomId]);

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

    const channel = supabase
      .channel(`multiplayer-game-${roomId}`)
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
            gameQueue: newData.gameQueue || prev.gameQueue,
            currentRound: newData.currentRound,
            currentSongStart: newData.currentSongStart,
          }));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Player", filter: `roomId=eq.${roomId}` },
        () => fetchPlayers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, myPlayerId, fetchPlayers]);

  // Zapisywanie wyników
  const saveScoresToProfiles = useCallback(async () => {
    console.log("💾 ZAPISYWANIE WYNIKÓW...");
    try {
        const { data: lobbyPlayers } = await supabase.from("Player").select("nickname, score").eq("roomId", roomId);
        if (!lobbyPlayers || lobbyPlayers.length === 0) return;

        const nicknames = lobbyPlayers.map((p) => p.nickname);
        const { data: profiles } = await supabase.from("Profiles").select("id, nickname, points, games_played").in("nickname", nicknames);

        if (profiles && profiles.length > 0) {
        for (const lobbyPlayer of lobbyPlayers) {
            if (!lobbyPlayer.score || lobbyPlayer.score <= 0) continue;
            const profile = profiles.find((p) => p.nickname === lobbyPlayer.nickname);

            if (profile) {
            const newTotalPoints = (profile.points || 0) + lobbyPlayer.score;
            const newGamesPlayed = (profile.games_played || 0) + 1;

            await supabase.from("Profiles").update({ points: newTotalPoints, games_played: newGamesPlayed }).eq("id", profile.id);
            
            try {
                const { data: rankData } = await supabase.from("GlobalRanking").select("totalScore").eq("nickname", lobbyPlayer.nickname).maybeSingle();
                const currentRankScore = rankData ? rankData.totalScore : 0;
                
                await supabase.from("GlobalRanking").upsert({
                    nickname: lobbyPlayer.nickname,
                    totalScore: currentRankScore + lobbyPlayer.score,
                    updatedAt: new Date().toISOString()
                }, { onConflict: "nickname" });
            } catch (innerErr) {
                console.warn(`Nie udało się zaktualizować rankingu globalnego dla ${lobbyPlayer.nickname}:`, innerErr);
            }
            }
        }
        }
    } catch (err) {
        console.error("Błąd podczas zapisywania wyników:", err);
    }
  }, [roomId]);

  const handleGameFinish = useCallback(async () => {
    setRoomState((prev) => ({ ...prev, status: "FINISHED" }));
    if (isHost) {
      await saveScoresToProfiles();
      await supabase.from("Room").update({ status: "FINISHED" }).eq("id", roomId);
    }
  }, [isHost, roomId, saveScoresToProfiles]);

  const handleRestartGame = async () => {
    await supabase.from("Player").update({ score: 0 }).eq("roomId", roomId);
    await supabase.from("Room").update({ status: "WAITING", gameMode: null, gameQueue: null, currentRound: 0, currentSongStart: null }).eq("id", roomId);
    setHostStep("MODES");
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
  };

  const handleCloseRoom = async () => {
    await supabase.from("Room").delete().eq("id", roomId);
    navigate("/");
  };

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
    await supabase.from("Room").update({ gameMode: mode, gameQuery: query }).eq("id", roomId);
  };

  const handleLocalStateUpdate = useCallback((updates: Partial<typeof roomState>) => {
    setRoomState((prev) => ({ ...prev, ...updates }));
  }, []);

  const isGameActive = !!roomState.gameMode && roomState.status !== "FINISHED";

  const currentTrack =
    roomState.gameQueue && roomState.gameQueue[roomState.currentRound]
      ? { title: roomState.gameQueue[roomState.currentRound].title, artist: roomState.gameQueue[roomState.currentRound].artist }
      : null;

  const renderLeftColumn = () => {
    if (roomState.status === "FINISHED") {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full text-white animate-fade-in">
          <h1 className="text-5xl font-bold text-yellow-400 mb-8 neon-text">GAME OVER</h1>
          <div className="bg-gray-900/80 p-6 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl mb-8 overflow-y-auto max-h-[400px]">
            <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 text-center">RANKING (SAVED)</h3>
            {players.length > 0 ? (
              players.map((p, index) => (
                <div key={p.id} className="flex justify-between items-center p-3 border-b border-gray-800 last:border-0 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-xl w-8 ${index === 0 ? "text-yellow-400" : "text-gray-300"}`}>#{index + 1}</span>
                    <span className="text-lg">{p.nickname}</span>
                    {p.isHost && <span>👑</span>}
                  </div>
                  <span className="text-green-400 font-mono text-xl font-bold">{p.score || 0} pkt</span>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">Ładowanie wyników...</p>
            )}
          </div>
          {isHost ? (
            <div className="flex gap-4">
              <button onClick={handleRestartGame} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition active:scale-95">RESTART 🔄</button>
              <button onClick={handleCloseRoom} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition active:scale-95">CLOSE ❌</button>
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
          // Usunięto prop volume - teraz QuizPlayer bierze go z Contextu
        />
      );
    }

    if (isHost) {
      return hostStep === "GENRES" ? (
        <div className="w-full flex flex-col items-center">
          <button onClick={() => setHostStep("MODES")} className="self-start mb-4 text-gray-400 hover:text-white underline">← Wróć</button>
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
    <div className="master" style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", position: 'relative' }}>
      
      {/* Dodano komponent Settings, który kontroluje globalny Context */}
      <Settings />

      <div style={{
          display: "flex", width: "100%", maxWidth: isGameActive || roomState.status === "FINISHED" ? "1400px" : "800px",
          margin: "0 auto", height: "100%", padding: "20px", gap: "20px",
          justifyContent: isGameActive || roomState.status === "FINISHED" ? "flex-start" : "center",
          transition: "max-width 0.5s ease",
        }}
      >
        <div style={{ flex: isGameActive || roomState.status === "FINISHED" ? 3 : 1, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", minWidth: 0 }}>
          {renderLeftColumn()}
        </div>
        {(isGameActive || roomState.status === "FINISHED") && (
          <div style={{ flex: 1, minWidth: "300px", maxWidth: "400px", height: "100%" }}>
            <ChatWindow 
              roomId={roomId!} 
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