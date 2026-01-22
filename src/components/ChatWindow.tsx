import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

interface ChatWindowProps {
  roomId: string;
  nickname: string;
  currentTrack: { title: string; artist: string } | null;
  roundStartTime: string | null;
}

export default function ChatWindow({
  roomId,
  nickname,
  currentTrack,
  roundStartTime,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [hasGuessedTitle, setHasGuessedTitle] = useState(false);
  const [hasGuessedArtist, setHasGuessedArtist] = useState(false);

  // Używamy REFA, żeby mieć zawsze świeży utwór w funkcji sendMessage
  const currentTrackRef = useRef(currentTrack);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const myPlayerId = localStorage.getItem("myPlayerId");

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Reset flag po zmianie piosenki
  useEffect(() => {
    console.log(
      "[Chat] Nowa runda wykryta -> Reset flag.",
      currentTrack?.title,
    );
    setHasGuessedTitle(false);
    setHasGuessedArtist(false);
  }, [currentTrack?.title, currentTrack?.artist]);

  const normalize = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[\(\[].*?[\)\]]/g, "") // Usuwa nawiasy
      .replace(/-.*$/, "") // Usuwa "- Remastered"
      .replace(/feat\..*$/, "")
      .replace(/ft\..*$/, "")
      .replace(/[^a-z0-9 ]/g, "") // Usuwa znaki specjalne
      .trim();
  };

  const calculatePoints = () => {
    if (!roundStartTime) return 10;
    const now = Date.now();
    const start = new Date(roundStartTime).getTime();
    const elapsedSec = (now - start) / 1000;
    const timeLeft = Math.max(0, 30 - elapsedSec);
    return Math.floor(timeLeft * 3) + 10;
  };

  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageId = crypto.randomUUID();
    const messageText = newMessage;
    setNewMessage("");

    let isGuess = false;
    let pointsAwarded = 0;
    let systemMsg = "";

    const activeTrack = currentTrackRef.current;

    if (activeTrack) {
      const userGuess = normalize(messageText);
      const targetTitle = normalize(activeTrack.title);
      const targetArtist = normalize(activeTrack.artist);

      // --- LOGOWANIE DEBUGOWE ---
      // Otwórz konsolę (F12) i zobacz co tu wyskakuje po wpisaniu tekstu
      console.log(
        `[ZGADYWANIE] Ty: "${userGuess}" | Cel Tytuł: "${targetTitle}" | Cel Artysta: "${targetArtist}"`,
      );

      // 1. TYTUŁ
      if (userGuess === targetTitle && !hasGuessedTitle) {
        console.log("-> Zgadnięto tytuł!");
        setHasGuessedTitle(true);
        isGuess = true;
        pointsAwarded = calculatePoints();
        systemMsg = `🎶 ${nickname} zgadł TYTUŁ! (+${pointsAwarded} pkt)`;

        await supabase.rpc("add_points", {
          row_id: myPlayerId,
          points: pointsAwarded,
        });
      }

      // 2. ARTYSTA
      else if (userGuess === targetArtist && !hasGuessedArtist) {
        console.log("-> Zgadnięto artystę!");
        setHasGuessedArtist(true);
        isGuess = true;
        pointsAwarded = Math.floor(calculatePoints() / 2);
        systemMsg = `🎤 ${nickname} zgadł ARTYSTĘ! (+${pointsAwarded} pkt)`;

        await supabase.rpc("add_points", {
          row_id: myPlayerId,
          points: pointsAwarded,
        });
      }
    } else {
      console.warn("[Chat] Brak aktywnego utworu do sprawdzenia.");
    }

    const finalMessageObj = isGuess
      ? {
          id: messageId,
          text: systemMsg,
          nickname: "SYSTEM",
          roomId,
          createdAt: new Date().toISOString(),
        }
      : {
          id: messageId,
          text: messageText,
          nickname,
          roomId,
          createdAt: new Date().toISOString(),
        };

    setMessages((prev) => [...prev, finalMessageObj]);
    await supabase.from("Message").insert([finalMessageObj]);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("Message")
      .select("*")
      .eq("roomId", roomId)
      .order("createdAt", { ascending: true });
    if (data) setMessages(data);
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `roomId=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(0,0,0,0.3)",
        borderRadius: "15px",
        border: "1px solid rgba(255,255,255,0.2)",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "15px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {messages.map((msg) => {
          const isSystem = msg.nickname === "SYSTEM";
          const isMe = msg.nickname === nickname;
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isSystem
                  ? "center"
                  : isMe
                    ? "flex-end"
                    : "flex-start",
                maxWidth: isSystem ? "100%" : "85%",
                marginBottom: "5px",
                display: "flex",
                flexDirection: "column",
                alignItems: isSystem
                  ? "center"
                  : isMe
                    ? "flex-end"
                    : "flex-start",
              }}
            >
              {!isSystem && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "#aaa",
                    marginLeft: "5px",
                  }}
                >
                  {msg.nickname}
                </span>
              )}
              <div
                style={{
                  background: isSystem
                    ? "rgba(74, 222, 128, 0.2)"
                    : isMe
                      ? "#4ade80"
                      : "white",
                  color: isSystem ? "#4ade80" : "black",
                  border: isSystem ? "1px solid #4ade80" : "none",
                  padding: "5px 10px",
                  borderRadius: "10px",
                  borderBottomRightRadius: isMe && !isSystem ? "0" : "10px",
                  borderBottomLeftRadius: !isMe && !isSystem ? "0" : "10px",
                  fontSize: isSystem ? "0.85rem" : "0.9rem",
                  fontWeight: isSystem ? "bold" : "normal",
                  textAlign: isSystem ? "center" : "left",
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <form
        onSubmit={sendMessage}
        style={{
          display: "flex",
          padding: "10px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <input
          type="text"
          placeholder="Zgadnij utwór..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "5px",
            color: "white",
            padding: "8px",
            marginRight: "5px",
          }}
        />
        <button
          type="submit"
          style={{
            background: "#4ade80",
            border: "none",
            borderRadius: "5px",
            padding: "0 10px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          SEND
        </button>
      </form>
    </div>
  );
}