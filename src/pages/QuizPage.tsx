// src/pages/QuizPage.tsx
import QuizPlayer from "../components/QuizPlayer";
import type { GameMode } from "../types/types";

interface QuizPageProps {
  multiplayerMode: string; // Wymagane
  roomId: string; // Wymagane
  isHost: boolean; // Wymagane
  initialQuery?: string; // Opcjonalne (dla genres)
}

export default function QuizPage({
  multiplayerMode,
  roomId,
  isHost,
  initialQuery,
}: QuizPageProps) {
  return (
    <QuizPlayer
      mode={multiplayerMode as GameMode}
      roomId={roomId}
      isHost={isHost}
      initialQuery={initialQuery}
    />
  );
}
