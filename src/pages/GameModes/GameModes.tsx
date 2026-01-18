import { useNavigate } from "react-router-dom";
import MenuButton from "../../components/MenuButton/MenuButton"; // Upewnij się co do ścieżki
import type { GameMode } from "../../types/types";
import "./GameModes.css";

interface GameModesProps {
  onModeSelect?: (mode: GameMode) => void; // Nowy props dla Multiplayera
}

export default function GameModes({ onModeSelect }: GameModesProps) {
  const navigate = useNavigate();

  const handleSelect = (mode: GameMode, path: string) => {
    if (onModeSelect) {
      // Tryb Multiplayer (zostajemy w pokoju)
      onModeSelect(mode);
    } else {
      // Tryb Single Player (zmieniamy stronę)
      navigate(path);
    }
  };

  return (
    <div className="gamemodes-page">
      <h1 className="gamemodes-title">Wybierz tryb rozgrywki</h1>

      <div className="gamemodes-list">
        {/* Przycisk: PLAYLISTA */}
        <div onClick={() => handleSelect("playlist", "/play/playlist")}>
          <MenuButton label="PLAYLISTA" to="#" disabledLink />
        </div>

        {/* Przycisk: GATUNEK */}
        <div onClick={() => handleSelect("genre", "/genres")}>
          <MenuButton label="GATUNEK" to="#" disabledLink />
        </div>

        {/* Przycisk: ARTYSTA */}
        <div onClick={() => handleSelect("artist", "/play/artist")}>
          <MenuButton label="ARTYSTA" to="#" disabledLink />
        </div>
      </div>
    </div>
  );
}