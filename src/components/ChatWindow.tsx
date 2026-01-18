import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

interface ChatWindowProps {
  roomId: string;
  nickname: string;
}

export default function ChatWindow({ roomId, nickname }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- POBIERANIE WIADOMOŚCI ---
  const fetchMessages = async () => {
    const { data } = await supabase
      .from("Message")
      .select("*")
      .eq("roomId", roomId)
      .order("createdAt", { ascending: true });
    if (data) setMessages(data);
  };

  // --- WYSYŁANIE ---
  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Tutaj w przyszłości dodasz logikę: "JEŚLI TEXT == TYTUŁ PIOSENKI -> PUNKT"

    await supabase.from("Message").insert([
      {
        id: crypto.randomUUID(),
        text: newMessage,
        nickname: nickname,
        roomId: roomId,
      },
    ]);
    setNewMessage("");
  };

  // --- SUBSKRYPCJA ---
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
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Scrollowanie do dołu
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
        height: "100%", // Wypełnij dostępną wysokość
        maxHeight: "100%",
      }}
    >
      {/* LISTA WIADOMOŚCI */}
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
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.nickname === nickname ? "flex-end" : "flex-start",
              maxWidth: "85%",
            }}
          >
            <span
              style={{ fontSize: "0.7rem", color: "#aaa", marginLeft: "5px" }}
            >
              {msg.nickname}
            </span>
            <div
              style={{
                background: msg.nickname === nickname ? "#4ade80" : "white",
                color: "black",
                padding: "5px 10px",
                borderRadius: "10px",
                borderBottomRightRadius:
                  msg.nickname === nickname ? "0" : "10px",
                borderBottomLeftRadius:
                  msg.nickname !== nickname ? "0" : "10px",
                fontSize: "0.9rem",
                wordBreak: "break-word",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* INPUT */}
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
