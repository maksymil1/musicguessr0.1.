import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import "./home.css";

// --- TYPY ---
interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  roomId: string;
}

interface Message {
  id: string;
  text: string;
  nickname: string;
  roomId: string;
  createdAt: string;
}

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // Stan
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomCode, setRoomCode] = useState("...");
  const [newMessage, setNewMessage] = useState("");

  const myNickname = localStorage.getItem("myNickname") || "Anon";
  const myPlayerId = localStorage.getItem("myPlayerId");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- LOGIKA POBIERANIA DANYCH ---

  const fetchData = useCallback(async () => {
    if (!roomId) return;

    const [playersRes, messagesRes, roomRes] = await Promise.all([
      supabase.from("Player").select("*").eq("roomId", roomId).order("createdAt", { ascending: true }),
      supabase.from("Message").select("*").eq("roomId", roomId).order("createdAt", { ascending: true }),
      supabase.from("Room").select("code, status").eq("id", roomId).single()
    ]);

    if (playersRes.data) setPlayers(playersRes.data);
    if (messagesRes.data) setMessages(messagesRes.data);
    if (roomRes.data) {
      setRoomCode(roomRes.data.code);
      if (roomRes.data.status === "PLAYING") navigate(`/game/${roomId}`);
    }
  }, [roomId, navigate]);

  // --- AKCJE ---

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !roomId) return;

    setNewMessage(""); // Optymistyczna aktualizacja UI (wyczyszczenie inputu)
    await supabase.from("Message").insert([{ 
        id: crypto.randomUUID(), 
        text, 
        nickname: myNickname, 
        roomId 
    }]);
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

  // --- EFFECT: SUBSKRYPCJE I INICJALIZACJA ---

  useEffect(() => {
    if (!roomId) return;

    fetchData();

    const channel = supabase
      .channel(`room-events-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "Player", filter: `roomId=eq.${roomId}` }, 
        () => fetchData())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message", filter: `roomId=eq.${roomId}` }, 
        (payload) => setMessages(prev => [...prev, payload.new as Message]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Room", filter: `id=eq.${roomId}` }, 
        (payload) => {
          if (payload.new.status === "PLAYING") navigate(`/game/${roomId}`);
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "Room", filter: `id=eq.${roomId}` }, 
        () => {
          alert("Lobby has been closed by host!");
          navigate("/");
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchData, navigate]);

  // Autoscroll czatu
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isHost = players.find(p => p.id === myPlayerId)?.isHost;

  return (
    <div className="master">
      <div className="lobby-layout">
        
        {/* Header */}
        <header className="lobby-header">
          <h2>LOBBY</h2>
          <div className="room-badge">
            <small>CODE</small>
            <span>{roomCode}</span>
          </div>
        </header>

        <main className="lobby-content">
          {/* Kolumna Lewa: Gracze */}
          <section className="players-column">
            <h3>PLAYERS ({players.length})</h3>
            <div className="scrollable-list">
              <AnimatePresence mode="popLayout">
                {players.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </AnimatePresence>
            </div>
          </section>

          {/* Kolumna Prawa: Czat */}
          <section className="chat-column">
            <div className="messages-container">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-bubble ${msg.nickname === myNickname ? "mine" : "others"}`}>
                  <span className="msg-user">{msg.nickname}</span>
                  <div className="msg-text">{msg.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={sendMessage} className="chat-form">
              <input 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit">SEND</button>
            </form>
          </section>
        </main>

        {/* Stopka: Przyciski sterujące */}
        <footer className="lobby-footer">
          {isHost && (
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              className="btn-primary"
              onClick={() => navigate(`/modes/${roomId}`)}
            >
              SELECT MODE & START 🎵
            </motion.button>
          )}

          <button onClick={leaveLobby} className="btn-danger">
            {isHost ? "CLOSE LOBBY (HOST)" : "LEAVE LOBBY"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// --- POMOCNICZY KOMPONENT KARTY GRACZA ---
function PlayerCard({ player }: { player: Player }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, scale: 0.9 }} 
      className={`player-item ${player.isHost ? "is-host" : ""}`}
    >
      <span>{player.nickname}</span>
      {player.isHost && <span>👑</span>}
    </motion.div>
  );
}