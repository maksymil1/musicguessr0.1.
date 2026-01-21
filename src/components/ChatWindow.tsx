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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const myPlayerId = localStorage.getItem("myPlayerId");

  // Reset flag zgadywania przy zmianie piosenki
  useEffect(() => {
    setHasGuessedTitle(false);
    setHasGuessedArtist(false);
  }, [currentTrack?.title]);

  // --- ULEPSZONA FUNKCJA CZYSZCZĄCA ---
  const normalize = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[\(\[].*?[\)\]]/g, "") // Usuwa nawiasy
      .replace(/-.*$/, "") // Usuwa wszystko po myślniku
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

  // --- FUNKCJA DO AKTUALIZACJI PUNKTÓW W BAZIE ---
  const updateScoreInDb = async (pointsToAdd: number) => {
    if (!myPlayerId) return;

    // 1. Pobierz aktualny wynik
    const { data: playerData, error: fetchError } = await supabase
      .from("Player")
      .select("score")
      .eq("id", myPlayerId)
      .single();

    if (fetchError) {
      console.error("Błąd pobierania wyniku:", fetchError);
      return;
    }

    const currentScore = playerData?.score || 0;
    const newScore = currentScore + pointsToAdd;

    // 2. Zapisz nowy wynik
    const { error: updateError } = await supabase
      .from("Player")
      .update({ score: newScore })
      .eq("id", myPlayerId);

    if (updateError) {
      console.error("Błąd aktualizacji wyniku:", updateError);
    } else {
      console.log(`Zaktualizowano wynik: ${currentScore} -> ${newScore}`);
    }
  };

  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageId = crypto.randomUUID();
    const messageText = newMessage;
    setNewMessage(""); // Czyścimy input od razu

    let isGuess = false;
    let pointsAwarded = 0;
    let systemMsg = "";

    // --- LOGIKA ZGADYWANIA ---
    if (currentTrack) {
      const userGuess = normalize(messageText);
      const targetTitle = normalize(currentTrack.title);
      const targetArtist = normalize(currentTrack.artist);

      console.log(
        `[Zgadywanie] Wpisano: "${userGuess}" | Cel: "${targetTitle}" / "${targetArtist}"`
      );

      // 1. Zgadnięcie TYTUŁU
      if (userGuess === targetTitle && !hasGuessedTitle) {
        setHasGuessedTitle(true);
        isGuess = true;
        pointsAwarded = calculatePoints();
        systemMsg = `🎶 ${nickname} zgadł TYTUŁ! (+${pointsAwarded} pkt)`;

        // AKTUALIZACJA PUNKTÓW
        await updateScoreInDb(pointsAwarded);
      }

      // 2. Zgadnięcie ARTYSTY
      else if (userGuess === targetArtist && !hasGuessedArtist) {
        setHasGuessedArtist(true);
        isGuess = true;
        pointsAwarded = Math.floor(calculatePoints() / 2);
        systemMsg = `🎤 ${nickname} zgadł ARTYSTĘ! (+${pointsAwarded} pkt)`;

        // AKTUALIZACJA PUNKTÓW
        await updateScoreInDb(pointsAwarded);
      }
    }

    // --- WYSYŁKA WIADOMOŚCI ---
    const finalMessageObj = isGuess
      ? {
          id: messageId,
          text: systemMsg,
          nickname: "SYSTEM",
          roomId: roomId,
          createdAt: new Date().toISOString(),
        }
      : {
          id: messageId,
          text: messageText,
          nickname: nickname,
          roomId: roomId,
          createdAt: new Date().toISOString(),
        };

    // Optimistic Update
    setMessages((prev) => [...prev, finalMessageObj]);

    // Zapis wiadomości do bazy
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
          const incomingMsg = payload.new;
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === incomingMsg.id)) return prev;
            return [...prev, incomingMsg];
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
                  wordBreak: "break-word",
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