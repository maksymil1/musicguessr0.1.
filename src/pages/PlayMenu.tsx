import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import logo from "../assets/logo.png";
import "./home.css";

export default function PlayMenu() {
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // --- LOGIKA TWORZENIA ---
  const createRoom = async () => {
    if (!nickname) return alert("Enter your nickname first!");
    setIsLoading(true);

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("Room").delete().lt("createdAt", yesterday);

      localStorage.setItem("myNickname", nickname);

      const newCode = Math.floor(1000 + Math.random() * 9000).toString();
      const roomId = crypto.randomUUID();
      const playerId = crypto.randomUUID();

      localStorage.setItem("myPlayerId", playerId);

      const { error: roomError } = await supabase
        .from("Room")
        .insert([{ id: roomId, code: newCode, status: "WAITING" }]);

      if (roomError) throw roomError;

      const { error: playerError } = await supabase
        .from("Player")
        .insert([{ id: playerId, nickname, roomId: roomId, isHost: true, score: 0 }]);

      if (playerError) throw playerError;

      navigate(`/lobby/${roomId}`);

    } catch (error: any) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIKA DOŁĄCZANIA ---
  const joinRoom = async () => {
    if (!nickname || !roomCode) return alert("Enter nickname and room code!");
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

      const playerId = crypto.randomUUID();
      
      localStorage.setItem("myNickname", nickname);
      localStorage.setItem("myPlayerId", playerId);

      const targetRoomId = (room as any).id;

      const { error: playerError } = await supabase
        .from("Player")
        .insert([{ 
            id: playerId, 
            nickname, 
            roomId: targetRoomId, 
            isHost: false, 
            score: 0 
        }]);

      if (playerError) throw playerError;

      navigate(`/lobby/${targetRoomId}`);

    } catch (error: any) {
      console.error(error);
      alert("Join error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // overflowY: auto -> dodaje przewijanie, jeśli ekran jest za mały
    <div className="master" style={{ overflowY: "auto", height: "100vh" }}>
      
      {/* justifyContent: flex-start -> zaczynamy od samej góry */}
      {/* paddingTop: 10px -> minimalny odstęp od sufitu */}
      <div className="home-container" style={{ 
          justifyContent: "flex-start", 
          paddingTop: "10px", 
          height: "auto", 
          minHeight: "100vh" 
      }}>
        
        {/* Logo bez zmian wielkości, ale bez marginesu dolnego */}
        <img 
            src={logo} 
            alt="MusicGuessr logo" 
            className="logo" 
            style={{ marginBottom: "0px" }} 
        />

        {/* marginTop: -20px -> wciągamy menu trochę pod logo (jeśli logo ma puste miejsce) */}
        <div className="buttons" style={{ 
            marginTop: "-20px", 
            display: "flex", 
            flexDirection: "column", 
            gap: "10px", 
            alignItems: "center", 
            width: "100%", 
            maxWidth: "400px",
            paddingBottom: "20px" // Odstęp na dole, żeby przycisk nie dotykał krawędzi
        }}>
          
          <input
            type="text"
            placeholder="YOUR NICKNAME"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="menu-button"
            style={{ textAlign: "center", background: "rgba(0,0,0,0.5)", border: "2px solid white", color: "white", width: "100%" }}
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            className="menu-button"
            onClick={createRoom}
            disabled={isLoading}
            style={{ width: "100%" }}
          >
            {isLoading ? "CREATING..." : "CREATE ROOM"}
          </motion.button>

          <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "10px", margin: "0" }}>
             <div style={{ height: "1px", background: "rgba(255,255,255,0.3)", flex: 1 }}></div>
             <p style={{ color: "white", fontSize: "0.8rem", margin: 0 }}>- OR -</p>
             <div style={{ height: "1px", background: "rgba(255,255,255,0.3)", flex: 1 }}></div>
          </div>

          <input
            type="text"
            placeholder="ENTER CODE"
            maxLength={4}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="menu-button"
            style={{ textAlign: "center", background: "rgba(0,0,0,0.5)", border: "2px solid white", color: "white", width: "100%" }}
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            className="menu-button"
            style={{ background: "#4ade80", color: "black", fontWeight: "bold", width: "100%" }}
            onClick={joinRoom}
            disabled={isLoading}
          >
            JOIN
          </motion.button>

          <button onClick={() => navigate("/")} style={{ background: "transparent", border: "none", color: "#aaa", marginTop: "10px", cursor: "pointer", textDecoration: "underline" }}>Back to menu</button>
        </div>
      </div>
    </div>
  );
}