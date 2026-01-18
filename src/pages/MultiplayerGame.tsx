// src/pages/MultiplayerGame.tsx
import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import QuizPlayer from "../components/QuizPlayer";
import GameModes from "./GameModes/GameModes";
import Genres from "./GameModes/Genres";
import type { GameMode } from "../types/types";
import "../pages/home.css"; // Style

export default function MultiplayerGame() {
  const { roomId } = useParams();

  if (!roomId) {
    return <Navigate to="/" replace />;
  }
  const myPlayerId = localStorage.getItem("myPlayerId");

  const [isHost, setIsHost] = useState(false);

  // Stan pokoju (pobierany z bazy)
  const [roomState, setRoomState] = useState<{
    gameMode: GameMode | null;
    gameQuery: string | null;
  }>({ gameMode: null, gameQuery: null });

  // Stan lokalny Hosta (do nawigacji po menu)
  const [hostStep, setHostStep] = useState<"MODES" | "GENRES">("MODES");

  useEffect(() => {
    if (!roomId) return;

    // 1. Sprawdź czy jestem Hostem
    const checkHost = async () => {
      const { data } = await supabase
        .from("Player")
        .select("isHost")
        .eq("id", myPlayerId)
        .single();
      if (data?.isHost) setIsHost(true);
    };
    checkHost();

    // 2. Pobierz stan początkowy
    const fetchRoomState = async () => {
      const { data } = await supabase
        .from("Room")
        .select("gameMode, gameQuery")
        .eq("id", roomId)
        .single();
      if (data)
        setRoomState({
          gameMode: data.gameMode as GameMode,
          gameQuery: data.gameQuery,
        });
    };
    fetchRoomState();

    // 3. Nasłuchuj zmian
    const channel = supabase
      .channel(`game-state-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Room",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newData = payload.new;
          if (newData.gameMode) {
            setRoomState({
              gameMode: newData.gameMode,
              gameQuery: newData.gameQuery,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, myPlayerId]);

  // --- LOGIKA HOSTA ---

  // 1. Host wybiera tryb
  const handleHostSelectMode = (mode: GameMode) => {
    if (mode === "genre") {
      // Jeśli gatunek -> przejdź do ekranu wyboru gatunków (lokalnie)
      setHostStep("GENRES");
    } else {
      // Jeśli Artysta/Playlista -> Zapisz w bazie (QuizPlayer się uruchomi, a w nim pole tekstowe)
      updateRoomAndStart(mode, ""); // Query puste, bo Host wpisze je w QuizPlayerze
    }
  };

  // 2. Host wybiera konkretny gatunek
  const handleHostSelectGenre = (playlistUrn: string) => {
    // Gatunek wybrany -> Zapisz w bazie (start gry)
    updateRoomAndStart("genre", playlistUrn);
  };

  // Funkcja wysyłająca start do bazy
  const updateRoomAndStart = async (mode: GameMode, query: string) => {
    if (!roomId) return;
    await supabase
      .from("Room")
      .update({
        gameMode: mode,
        gameQuery: query,
      })
      .eq("id", roomId);
  };

  // --- RENDEROWANIE ---

  // A. Gra wystartowała (jest tryb w bazie) -> Pokaż QuizPlayer
  if (roomState.gameMode) {
    return (
      <QuizPlayer
        mode={roomState.gameMode}
        roomId={roomId}
        isHost={isHost}
        initialQuery={roomState.gameQuery || undefined} // Przekazujemy zapytanie (np. urn playlisty)
      />
    );
  }

  // B. Gra nie wystartowała -> Menu wyboru (Dla Hosta)
  if (isHost) {
    if (hostStep === "GENRES") {
      return (
        <div className="flex justify-center pt-10 min-h-screen bg-gray-900">
          <Genres onGenreSelect={handleHostSelectGenre} />
          {/* Przycisk powrotu */}
          <button
            onClick={() => setHostStep("MODES")}
            className="fixed top-4 left-4 text-white underline"
          >
            ← Wróć do trybów
          </button>
        </div>
      );
    }
    // Domyślnie: GameModes
    return <GameModes onModeSelect={handleHostSelectMode} />;
  }

  // C. Gra nie wystartowała -> Ekran czekania (Dla Gościa)
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <div className="animate-spin h-10 w-10 border-4 border-green-500 rounded-full border-t-transparent mb-4"></div>
      <h2 className="text-2xl font-bold">OCZEKIWANIE NA HOSTA...</h2>
      <p className="text-gray-400">Host wybiera tryb gry.</p>
    </div>
  );
}