import { useNavigate } from "react-router-dom";
import MenuButton from "../../components/MenuButton/MenuButton"; // Ensure path is correct
import type { GameMode } from "../../types/types";
import "./GameModes.css";

interface GameModesProps {
  onModeSelect?: (mode: GameMode) => void; // New prop for Multiplayer
}

export default function GameModes({ onModeSelect }: GameModesProps) {
  const navigate = useNavigate();

  const handleSelect = (mode: GameMode, path: string) => {
    if (onModeSelect) {
      // Multiplayer mode (stay in the room)
      onModeSelect(mode);
    } else {
      // Single Player mode (navigate to path)
      navigate(path);
    }
  };

  return (
    <div className="gamemodes-page">
      <h1 className="gamemodes-title">Select Game Mode</h1>

      <div className="gamemodes-list">
        {/* Button: PLAYLIST */}
        <div onClick={() => handleSelect("playlist", "/play/playlist")}>
          <MenuButton label="PLAYLIST" to="#" disabledLink />
        </div>

        {/* Button: GENRE */}
        <div onClick={() => handleSelect("genre", "/genres")}>
          <MenuButton label="GENRE" to="#" disabledLink />
        </div>

        {/* Button: ARTIST */}
        <div onClick={() => handleSelect("artist", "/play/artist")}>
          <MenuButton label="ARTIST" to="#" disabledLink />
        </div>
      </div>
    </div>
  );
}