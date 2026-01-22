import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import MenuButton from "../components/MenuButton/MenuButton";

// Components
import QuizPlayer from "../components/QuizPlayer";
import GameModes from "./GameModes/GameModes";
import Genres from "./GameModes/Genres";
import ChatWindow from "../components/ChatWindow";
import Results from "./Results"; 

import type { GameMode, GameTrack } from "../types/types";
import "../pages/home.css";
import "./MultiplayerGame.css";

export default function MultiplayerGame() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  if (!roomId) return <Navigate to="/" replace />;

  const myNickname = localStorage.getItem("myNickname") || "Anon";
  const myPlayerId = localStorage.getItem("myPlayerId");

  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [hostStep, setHostStep] = useState<"MODES" | "GENRES">("MODES");
  
  // Protection against double saving results
  const [isSaving, setIsSaving] = useState(false);
  const hasFinished = useRef(false);

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

  const fetchPlayers = useCallback(async () => {
    const { data: sessionPlayers, error: playerError } = await supabase
      .from("Player")
      .select("*")
      .eq("roomId", roomId)
      .order("score", { ascending: false });
    
    if (playerError) return;

    if (sessionPlayers && sessionPlayers.length > 0) {
      const nicknames = sessionPlayers.map(p => p.nickname);
      const { data: profiles } = await supabase
        .from("Profiles")
        .select("nickname, avatar_url")
        .in("nickname", nicknames);

      const enrichedPlayers = sessionPlayers.map(p => {
        const profile = profiles?.find(pr => pr.nickname === p.nickname);
        return {
          ...p,
          avatar_url: profile?.avatar_url || null
        };
      });

      setPlayers((prev) =>
        JSON.stringify(prev) !== JSON.stringify(enrichedPlayers) ? enrichedPlayers : prev
      );
    } else {
      setPlayers([]);
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
        if (data.status === "FINISHED") hasFinished.current = true;
      }
    };

    checkHost();
    fetchRoomState();
    fetchPlayers();

    const channel = supabase
      .channel(`multiplayer-game-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Room", filter: `id=eq.${roomId}` },
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
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Player", filter: `roomId=eq.${roomId}` },
        () => fetchPlayers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, myPlayerId, fetchPlayers]);

  // --- ROOM SETUP HANDLERS ---

  const handleHostSelectMode = (mode: GameMode) => {
    if (mode === "genre") setHostStep("GENRES");
    else updateRoomSetup(mode, "");
  };

  const handleHostSelectGenre = (_: string, label: string) => {
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
      .update({ gameMode: mode, gameQuery: query, status: "WAITING" })
      .eq("id", roomId);
  };

  const handleGameFinish = async () => {
    if (!isHost || isSaving || hasFinished.current) return;

    setIsSaving(true);
    hasFinished.current = true;

    try {
      // 1. Mark room as finished in the DB
      await supabase.from("Room").update({ status: "FINISHED" }).eq("id", roomId);

      // 2. WAIT: Give players 1.5s to sync their final local scores to the 'Player' table
      // This prevents the host from pulling old/incomplete score data.
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { data: roomPlayers } = await supabase
        .from("Player")
        .select("nickname, score")
        .eq("roomId", roomId);

      if (roomPlayers) {
        // 3. Increment permanent global points via Database RPC
        await Promise.all(
          roomPlayers.map(p => 
            supabase.rpc("increment_profile_points", { 
              p_nickname: p.nickname, 
              p_score: p.score 
            })
          )
        );
      }
    } catch (err) {
      console.error("Critical error saving scores:", err);
      hasFinished.current = false;
      setIsSaving(false);
    } finally {
      // Refresh local player list to show final results
      setTimeout(() => fetchPlayers(), 300);
    }
  };

  const handleRestartGame = async () => {
    hasFinished.current = false;
    setIsSaving(false);

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
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
  };

  const handleCloseRoom = async () => {
    await supabase.from("Room").delete().eq("id", roomId);
    navigate("/");
  };

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
        <Results
          players={players}
          isHost={isHost}
          onRestart={handleRestartGame}
          onClose={handleCloseRoom}
        />
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
          onGameStateChange={(updates) =>
            setRoomState((prev) => ({ ...prev, ...updates }))
          }
        />
      );
    }

    if (isHost) {
      return hostStep === "GENRES" ? (
        <div className="w-full flex flex-col items-center">
          <div onClick={() => setHostStep("MODES")} style={{ alignSelf: "flex-start", marginBottom: "20px" }}>
            <MenuButton label="BACK" to="#" disabledLink />
          </div>
          <Genres onGenreSelect={handleHostSelectGenre} />
        </div>
      ) : (
        <GameModes onModeSelect={handleHostSelectMode} />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-white h-full w-full min-h-[70vh]">
        <div className="animate-spin h-16 w-16 border-4 border-green-500 rounded-full border-t-transparent mb-6"></div>
        <h2 className="text-3xl font-bold tracking-widest uppercase">Waiting for Host...</h2>
      </div>
    );
  };

  return (
    <div className="master" style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div className="multiplayer-layout" style={{ 
          maxWidth: isGameActive || roomState.status === "FINISHED" ? "1400px" : "800px",
          justifyContent: isGameActive || roomState.status === "FINISHED" ? "flex-start" : "center" 
        }}>
        <div className="game-column" style={{ flex: isGameActive || roomState.status === "FINISHED" ? 3 : 1 }}>
          {renderLeftColumn()}
        </div>

        {(isGameActive || roomState.status === "FINISHED") && (
          <div className="chat-column">
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