import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import "./home.css";

export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [players, setPlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState("...");
  const [newMessage, setNewMessage] = useState("");
  
  const myNickname = localStorage.getItem("myNickname") || "Anon";
  const myPlayerId = localStorage.getItem("myPlayerId");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- POBIERANIE DANYCH ---
  const fetchPlayers = async () => {
    if (!roomId) return;
    const { data } = await supabase.from("Player").select("*").eq("roomId", roomId).order("createdAt", { ascending: true });
    if (data) setPlayers(data);
  };

  const fetchMessages = async () => {
    if (!roomId) return;
    const { data } = await supabase.from("Message").select("*").eq("roomId", roomId).order("createdAt", { ascending: true });
    if (data) setMessages(data);
  };

  // --- SPRAWDZANIE CZY GRA WYSTARTOWAŁA (Dla Gości) ---
  const checkGameStatus = async () => {
    if (!roomId) return;
    // Sprawdzamy status pokoju
    const { data } = await supabase.from("Room").select("status").eq("id", roomId).single();
    
    // Jeśli status zmienił się na PLAYING -> przenosimy gracza do gry!
    if (data && data.status === "PLAYING") {
        navigate("/game");
    }
  };

  // --- AKCJE ---
  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await supabase.from("Message").insert([{ id: crypto.randomUUID(), text: newMessage, nickname: myNickname, roomId: roomId }]);
    setNewMessage("");
    fetchMessages();
  };

  const leaveLobby = async () => {
    if (!myPlayerId || !roomId) return;
    const amIHost = players.find(p => p.id === myPlayerId)?.isHost;

    if (amIHost) {
        await supabase.from("Room").delete().eq("id", roomId);
    } else {
        await supabase.from("Player").delete().eq("id", myPlayerId);
    }
    navigate("/");
  };

  // --- STARTOWANIE GRY (Tylko Host) ---
  const startGame = async () => {
    // 1. Zmieniamy status w bazie na PLAYING
    await supabase.from("Room").update({ status: "PLAYING" }).eq("id", roomId);
    
    // 2. Przenosimy Hosta od razu (Goście dołączą za chwilę dzięki checkGameStatus)
    navigate("/game");
  };

  // --- GŁÓWNA PĘTLA ---
  useEffect(() => {
    if (!roomId) return;

    supabase.from("Room").select("code").eq("id", roomId).single().then(({ data }) => {
       if (data) setRoomCode(data.code);
    });

    fetchPlayers();
    fetchMessages();

    // Realtime (działa jeśli włączony w bazie)
    const channel = supabase
      .channel("room-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "Player", filter: `roomId=eq.${roomId}` }, () => fetchPlayers())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message", filter: `roomId=eq.${roomId}` }, (payload) => {
          setMessages((prev) => [...prev, payload.new]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Room", filter: `id=eq.${roomId}` }, (payload) => {
          // Jeśli Realtime działa, to wykryje start gry natychmiast
          if (payload.new.status === "PLAYING") navigate("/game");
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "Room", filter: `id=eq.${roomId}` }, () => {
          alert("Lobby has been closed!");
          navigate("/");
      })
      .subscribe();

    // POLLING (Działa zawsze - co 2 sekundy sprawdza wszystko)
    const interval = setInterval(() => { 
        fetchPlayers(); 
        fetchMessages(); 
        checkGameStatus(); // <--- To sprawdza czy gra ruszyła
    }, 2000);

    const handleBeforeUnload = async () => {
       if (myPlayerId) {
           await supabase.from("Player").delete().eq("id", myPlayerId);
       }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isHost = players.length > 0 && players[0].nickname === myNickname;

  return (
    <div className="master">
      <div className="home-container" style={{ justifyContent: "flex-start", paddingTop: "40px", height: "100vh", overflow: "hidden" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: "800px", marginBottom: "20px", padding: "0 10px" }}>
            <h2 style={{ color: "white", letterSpacing: "2px", opacity: 0.8, margin: 0 }}>LOBBY</h2>
            <div style={{ background: "rgba(255,255,255,0.1)", padding: "5px 15px", borderRadius: "10px", border: "1px solid #fff" }}>
                <span style={{ color: "#aaa", fontSize: "0.7rem", display: "block" }}>CODE</span>
                <span style={{ color: "#4ade80", fontSize: "1.2rem", fontWeight: "bold", fontFamily: "monospace" }}>{roomCode}</span>
            </div>
        </div>

        <div style={{ display: "flex", gap: "20px", width: "100%", maxWidth: "800px", flex: 1, minHeight: 0, padding: "0 10px" }}>
            
            {/* LEWA KOLUMNA: GRACZE */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto" }}>
                <h3 style={{ color: "white", fontSize: "1rem" }}>PLAYERS ({players.length})</h3>
                <AnimatePresence>
                    {players.map((player) => (
                    <motion.div key={player.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="menu-button"
                        style={{ 
                            cursor: "default", 
                            display: "flex", justifyContent: "space-between", alignItems: "center", 
                            padding: "15px 20px",
                            background: player.isHost ? "rgba(74, 222, 128, 0.2)" : "rgba(255,255,255,0.1)", 
                            borderColor: player.isHost ? "#4ade80" : "white" 
                        }}>
                        
                        <span style={{ fontSize: "1.5rem" }}>{player.nickname}</span>
                        {player.isHost && <span style={{ fontSize: "1.5rem" }}>👑</span>}
                    
                    </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* PRAWA KOLUMNA: CZAT */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.3)", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.2)", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "15px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {messages.map((msg) => (
                        <div key={msg.id} style={{ alignSelf: msg.nickname === myNickname ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                            <span style={{ fontSize: "0.7rem", color: "#aaa", marginLeft: "5px" }}>{msg.nickname}</span>
                            <div style={{ background: msg.nickname === myNickname ? "#4ade80" : "white", color: "black", padding: "5px 10px", borderRadius: "10px",
                                borderBottomRightRadius: msg.nickname === myNickname ? "0" : "10px", borderBottomLeftRadius: msg.nickname !== myNickname ? "0" : "10px", fontSize: "0.9rem", wordBreak: "break-word" }}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <form onSubmit={sendMessage} style={{ display: "flex", padding: "10px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <input type="text" placeholder="..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                        style={{ flex: 1, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "5px", color: "white", padding: "8px", marginRight: "5px" }} />
                    <button type="submit" style={{ background: "#4ade80", border: "none", borderRadius: "5px", padding: "0 10px", cursor: "pointer", fontWeight: "bold" }}>SEND</button>
                </form>
            </div>
        </div>

        <div style={{ margin: "20px 0 30px 0", width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "10px", padding: "0 10px" }}>
            
            {/* PRZYCISK START: Teraz zmienia status w bazie */}
            <motion.button whileHover={{ scale: 1.02 }} className="menu-button" style={{ background: "#4ade80", color: "black", fontWeight: "bold", fontSize: "1.2rem", padding: "15px", width: "100%" }}
                onClick={startGame}> 
                START GAME 🎵
            </motion.button>

            <button onClick={leaveLobby} style={{ background: "transparent", border: "2px solid #ff6b6b", color: "#ff6b6b", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", width: "100%" }}>
                ❌ {isHost ? "CLOSE LOBBY (HOST)" : "LEAVE LOBBY"}
            </button>
        </div>
      </div>
    </div>
  );
}