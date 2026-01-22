import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import MenuButton from "../components/MenuButton/MenuButton.tsx"; // Importujemy Twój komponent
import logo from "../assets/logo.png";
import "./home.css";

export default function PlayMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. AUTO-UZUPEŁNIANIE NICKU ---
  useEffect(() => {
    if (user) {
      const userNick = user.user_metadata?.nickname || user.email?.split("@")[0];
      setNickname(userNick);
    } else {
      const stored = localStorage.getItem("myNickname");
      if (stored) setNickname(stored);
    }
  }, [user]);

  // --- 2. SETUP ---
  const setupPlayer = () => {
    const playerId = user ? user.id : crypto.randomUUID();
    localStorage.setItem("myNickname", nickname);
    localStorage.setItem("myPlayerId", playerId);
    return playerId;
  };

  const createRoom = async () => {
    if (!nickname) return alert("Enter nickname!");
    setIsLoading(true);

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("Room").delete().lt("createdAt", yesterday);

      const playerId = setupPlayer();
      await supabase.from("Player").delete().eq("id", playerId);

      const newCode = Math.floor(1000 + Math.random() * 9000).toString();
      const roomId = crypto.randomUUID();

      const { error: roomError } = await supabase
        .from("Room")
        .insert([{ id: roomId, code: newCode, status: "WAITING" }]);
      if (roomError) throw roomError;

      const { error: playerError } = await supabase
        .from("Player")
        .insert([
          { id: playerId, nickname, roomId: roomId, isHost: true, score: 0 },
        ]);
      if (playerError) throw playerError;

      navigate(`/lobby/${roomId}`);
    } catch (error: any) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!nickname || !roomCode) return alert("Enter nickname and code!");
    setIsLoading(true);

    try {
      const { data: room, error: roomError } = await supabase
        .from("Room")
        .select("*")
        .eq("code", roomCode)
        .single();

      if (roomError || !room) {
        alert("Room not found!");
        setIsLoading(false);
        return;
      }

      const playerId = setupPlayer();
      await supabase.from("Player").delete().eq("id", playerId);

      const targetRoomId = (room as any).id;

      const { error: playerError } = await supabase.from("Player").insert([
        { id: playerId, nickname, roomId: targetRoomId, isHost: false, score: 0 },
      ]);

      if (playerError && playerError.code !== "23505") throw playerError;

      navigate(`/lobby/${targetRoomId}`);
    } catch (error: any) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- STYLE ---
  const loggedInStyle = {
    textAlign: "center",
    background: "rgba(0,0,0,0.5)",
    border: "2px solid #4ade80",
    color: "white",
    width: "100%",
    padding: "20px",
    cursor: "default",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "5px",
    borderRadius: "15px",
  } as const;

  const bigControlStyle = {
    width: "100%",
    padding: "25px",
    fontSize: "1.5rem",
    borderRadius: "15px",
    fontWeight: "bold",
    textTransform: "uppercase",
  } as const;

  return (
    <div className="master" style={{ overflowY: "auto", height: "100vh" }}>
      <div
        className="home-container"
        style={{
          justifyContent: "flex-start",
          paddingTop: "10px",
          height: "auto",
          minHeight: "100vh",
        }}
      >
        <img src={logo} alt="MusicGuessr logo" className="logo" style={{ marginBottom: "0px" }} />

        <div
          className="buttons"
          style={{
            marginTop: "-20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            alignItems: "center",
            width: "100%",
            maxWidth: "550px",
            paddingBottom: "40px",
          }}
        >
          {user ? (
            <div className="menu-button" style={loggedInStyle}>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#aaa", letterSpacing: "3px" }}>LOGGED AS</p>
              <div style={{ fontSize: "2rem", fontWeight: "bold", textShadow: "0 0 15px rgba(74, 222, 128, 0.4)" }}>
                {nickname}
              </div>
            </div>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate("/login")}
                className="menu-button"
                style={{ ...bigControlStyle, background: "transparent", border: "2px solid #4ade80", color: "white", fontSize: "1.2rem" }}
              >
                LOGIN (SAVE STATS)
              </motion.button>

              <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "15px" }}>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.3)", flex: 1 }}></div>
                <p style={{ color: "white", fontSize: "0.8rem", margin: 0 }}>OR</p>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.3)", flex: 1 }}></div>
              </div>

              <input
                type="text"
                placeholder="YOUR NICKNAME"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="menu-button"
                style={{ ...bigControlStyle, textAlign: "center", background: "rgba(0,0,0,0.5)", border: "2px solid white", color: "white" }}
              />
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            className="menu-button"
            onClick={createRoom}
            disabled={isLoading}
            style={{ ...bigControlStyle, background: "white", color: "black", fontSize: "2rem" }}
          >
            {isLoading ? "CREATING..." : "CREATE ROOM"}
          </motion.button>

          <div style={{ width: "100%", display: "flex", gap: "15px" }}>
            <input
              type="text"
              placeholder="CODE"
              maxLength={4}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="menu-button"
              style={{ ...bigControlStyle, textAlign: "center", background: "rgba(0,0,0,0.5)", border: "2px solid white", color: "white", flex: 1, minWidth: "0" }}
            />

            <motion.button
              whileHover={{ scale: 1.05 }}
              className="menu-button"
              style={{ ...bigControlStyle, background: "#4ade80", color: "black", flex: 1 }}
              onClick={joinRoom}
              disabled={isLoading}
            >
              JOIN
            </motion.button>
          </div>

          {/* TUTAJ POPRAWKA: Używamy Twojego MenuButton dla spójności */}
          <div style={{ marginTop: "30px", width: "100%", display: "flex", justifyContent: "center" }}>
            <MenuButton label="BACK TO MENU" to="/" />
          </div>
        </div>
      </div>
    </div>
  );
}