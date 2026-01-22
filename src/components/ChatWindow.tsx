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

  // REFS
  const currentTrackRef = useRef(currentTrack);
  const startTimeRef = useRef(roundStartTime);

  const [localStartTime, setLocalStartTime] = useState<number>(Date.now());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const myPlayerId = localStorage.getItem("myPlayerId");

  // Synchronizacja refów
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    startTimeRef.current = roundStartTime;
  }, [roundStartTime]);

  // RESET STANU
  useEffect(() => {
    setHasGuessedTitle(false);
    setHasGuessedArtist(false);
    setLocalStartTime(Date.now());
  }, [currentTrack?.title, currentTrack?.artist]);

  const normalize = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[\(\[].*?[\)\]]/g, "")
      .replace(/-.*$/, "")
      .replace(/feat\..*$/, "")
      .replace(/ft\..*$/, "")
      .replace(/[^a-z0-9 ]/g, "")
      .trim();
  };

  const calculatePoints = (type: "TITLE" | "ARTIST") => {
    const now = Date.now();
    let startMs = localStartTime;
    let method = "LOCAL";

    if (startTimeRef.current) {
      const serverStart = new Date(startTimeRef.current).getTime();
      const diffSec = (now - serverStart) / 1000;

      if (diffSec >= 0 && diffSec < 40) {
        startMs = serverStart;
        method = "SERVER";
      } else {
        method = "LOCAL_FALLBACK";
      }
    }

    const elapsedSec = (now - startMs) / 1000;
    const timeLeft = Math.max(0, 30 - elapsedSec);

    const basePoints = type === "TITLE" ? 50 : 30;
    const timeMultiplier = type === "TITLE" ? 5 : 2;

    const points = Math.floor(basePoints + timeLeft * timeMultiplier);

    return Math.max(points, basePoints);
  };

  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage;

    let isGuess = false;
    let pointsAwarded = 0;
    let systemMsg = "";

    const activeTrack = currentTrackRef.current;

    if (activeTrack) {
      const userGuess = normalize(messageText);
      const targetTitle = normalize(activeTrack.title);
      const targetArtist = normalize(activeTrack.artist);

      // BLOKADA SPOJLERÓW
      if (
        (userGuess === targetTitle && hasGuessedTitle) ||
        (userGuess === targetArtist && hasGuessedArtist)
      ) {
        setNewMessage("");
        return;
      }

      // 1. Zgadnięcie TYTUŁU
      if (userGuess === targetTitle && !hasGuessedTitle) {
        setHasGuessedTitle(true);
        isGuess = true;
        pointsAwarded = calculatePoints("TITLE");
        // W bazie zapisujemy wersję ogólną (bezpieczną)
        systemMsg = `🎶 ${nickname} zgadł TYTUŁ! (+${pointsAwarded} pkt)`;

        await supabase.rpc("add_points", {
          row_id: myPlayerId,
          points: pointsAwarded,
        });
      }

      // 2. Zgadnięcie ARTYSTY
      else if (userGuess === targetArtist && !hasGuessedArtist) {
        setHasGuessedArtist(true);
        isGuess = true;
        pointsAwarded = calculatePoints("ARTIST");
        systemMsg = `🎤 ${nickname} zgadł ARTYSTĘ! (+${pointsAwarded} pkt)`;

        await supabase.rpc("add_points", {
          row_id: myPlayerId,
          points: pointsAwarded,
        });
      }
    }

    setNewMessage(""); // Czyścimy input od razu

    const messageId = crypto.randomUUID();
    const finalMessageObj = {
      id: messageId,
      text: isGuess ? systemMsg : messageText,
      nickname: isGuess ? "SYSTEM" : nickname,
      roomId: roomId,
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
        maxHeight: "100%",
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

          // --- LOGIKA WYŚWIETLANIA ODPOWIEDZI ---
          let displayText = msg.text;

          // Jeśli to wiadomość systemowa O MNIE (zawiera mój nick), to podmieniamy tekst na konkretny
          if (isSystem && msg.text.includes(nickname) && currentTrack) {
            // Sprawdzamy czy to o tytule
            if (msg.text.includes("zgadł TYTUŁ")) {
              displayText = msg.text.replace(
                "TYTUŁ",
                `TYTUŁ: "${currentTrack.title}"`,
              );
            }
            // Sprawdzamy czy to o artyście
            else if (msg.text.includes("zgadł ARTYSTĘ")) {
              displayText = msg.text.replace(
                "ARTYSTĘ",
                `ARTYSTĘ: "${currentTrack.artist}"`,
              );
            }
          }

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
                    marginRight: "5px",
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
                {/* Używamy przetworzonego tekstu */}
                {displayText}
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
          placeholder="Zgadnij..."
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