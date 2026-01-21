import { useNavigate } from "react-router-dom";
import MenuButton from "../../components/MenuButton/MenuButton";
import type { GameMode } from "../../types/types";
import "./GameModes.css";

interface GameModesProps {
  onModeSelect?: (mode: GameMode) => void;
}

export default function GameModes({ onModeSelect }: GameModesProps) {
  const navigate = useNavigate();

  const handleSelect = (mode: GameMode, path: string) => {
    if (onModeSelect) {
      // Tryb Multiplayer
      console.log("Wybrano tryb (Multiplayer):", mode);
      onModeSelect(mode);
    } else {
      // Tryb Single Player
      console.log("Wybrano tryb (Single):", mode);
      navigate(path);
    }
  };

  return (
    <div className="gamemodes-page">
      <h1 className="gamemodes-title">Wybierz tryb rozgrywki</h1>

      <div className="gamemodes-list">
        {/* PLAYLISTA */}
        <div
          onClick={() => handleSelect("playlist", "/play/playlist")}
          style={{ cursor: "pointer" }} // Wymuszamy łapkę, bo to wrapper
        >
          {/* disabledLink sprawia, że MenuButton to tylko div wizualny */}
          <MenuButton label="PLAYLISTA" to="#" disabledLink />
        </div>

        {/* GATUNEK */}
        <div
          onClick={() => handleSelect("genre", "/genres")}
          style={{ cursor: "pointer" }}
        >
          <MenuButton label="GATUNEK" to="#" disabledLink />
        </div>

        {/* ARTYSTA */}
        <div
          onClick={() => handleSelect("artist", "/play/artist")}
          style={{ cursor: "pointer" }}
        >
          <MenuButton label="ARTYSTA" to="#" disabledLink />
        </div>
      </div>
    </div>
  );
}
