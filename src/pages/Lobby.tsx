import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import ChatWindow from "../components/ChatWindow"; // IMPORTUJEMY CZAT
import "./home.css";

export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState("...");

  const myNickname = localStorage.getItem("myNickname") || "Anon";
  const myPlayerId = localStorage.getItem("myPlayerId");

  const fetchPlayers = async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("Player")
      .select("*")
      .eq("roomId", roomId)
      .order("createdAt", { ascending: true });
    if (data) setPlayers(data);
  };

  const checkGameStatus = async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("Room")
      .select("status")
      .eq("id", roomId)
      .single();
    if (data && data.status === "PLAYING") {
      navigate(`/game/${roomId}`);
    }
  };

  const leaveLobby = async () => {
    if (!myPlayerId || !roomId) return;
    const amIHost = players.find((p) => p.id === myPlayerId)?.isHost;
    if (amIHost) {
      await supabase.from("Room").delete().eq("id", roomId);
    } else {
      await supabase.from("Player").delete().eq("id", myPlayerId);
    }
    navigate("/");
  };

  const startGame = async () => {
    if (!roomId) return;
    await supabase.from("Room").update({ status: "PLAYING" }).eq("id", roomId);
    navigate(`/game/${roomId}`);
  };

  useEffect(() => {
    if (!roomId) return;

    supabase
      .from("Room")
      .select("code")
      .eq("id", roomId)
      .single()
      .then(({ data }) => {
        if (data) setRoomCode(data.code);
      });

    fetchPlayers();

    const channel = supabase
      .channel(`room-players-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Player",
          filter: `roomId=eq.${roomId}`,
        },
        () => fetchPlayers()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Room",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new.status === "PLAYING") navigate(`/game/${roomId}`);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "Room",
          filter: `id=eq.${roomId}`,
        },
        () => {
          alert("Lobby closed!");
          navigate("/");
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchPlayers();
      checkGameStatus();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [roomId, navigate]);

  const isHost =
    players.length > 0 && players.find((p) => p.id === myPlayerId)?.isHost;

  return (
    <div className="master">
      <div
        className="home-container"
        style={{
          justifyContent: "flex-start",
          paddingTop: "40px",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            maxWidth: "800px",
            marginBottom: "20px",
            padding: "0 10px",
          }}
        >
          <h2
            style={{
              color: "white",
              letterSpacing: "2px",
              opacity: 0.8,
              margin: 0,
            }}
          >
            LOBBY
          </h2>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              padding: "5px 15px",
              borderRadius: "10px",
              border: "1px solid #fff",
            }}
          >
            <span
              style={{ color: "#aaa", fontSize: "0.7rem", display: "block" }}
            >
              CODE
            </span>
            <span
              style={{
                color: "#4ade80",
                fontSize: "1.2rem",
                fontWeight: "bold",
                fontFamily: "monospace",
              }}
            >
              {roomCode}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            width: "100%",
            maxWidth: "800px",
            flex: 1,
            minHeight: 0,
            padding: "0 10px",
          }}
        >
          {/* LEWA STRONA: LISTA GRACZY */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              overflowY: "auto",
            }}
          >
            <h3 style={{ color: "white", fontSize: "1rem" }}>
              PLAYERS ({players.length})
            </h3>
            <AnimatePresence>
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="menu-button"
                  style={{
                    cursor: "default",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "15px 20px",
                    background: player.isHost
                      ? "rgba(74, 222, 128, 0.2)"
                      : "rgba(255,255,255,0.1)",
                    borderColor: player.isHost ? "#4ade80" : "white",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>{player.nickname}</span>
                  {player.isHost && (
                    <span style={{ fontSize: "1.5rem" }}>👑</span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* PRAWA STRONA: CZAT (Nowy Komponent) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {roomId && <ChatWindow roomId={roomId} nickname={myNickname} />}
          </div>
        </div>

        {/* PRZYCISKI START/EXIT */}
        <div
          style={{
            margin: "20px 0 30px 0",
            width: "100%",
            maxWidth: "800px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "0 10px",
          }}
        >
          {isHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="menu-button"
              style={{
                background: "#4ade80",
                color: "black",
                fontWeight: "bold",
                fontSize: "1.2rem",
                padding: "15px",
                width: "100%",
              }}
              onClick={startGame}
            >
              START GAME 🎵
            </motion.button>
          )}
          <button
            onClick={leaveLobby}
            style={{
              background: "transparent",
              border: "2px solid #ff6b6b",
              color: "#ff6b6b",
              padding: "10px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              width: "100%",
            }}
          >
            ❌ {isHost ? "CLOSE LOBBY" : "LEAVE LOBBY"}
          </button>
        </div>
      </div>
    </div>
  );
}
