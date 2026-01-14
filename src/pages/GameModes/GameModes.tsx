import { useParams } from "react-router-dom";
import MenuButton from "../../components/MenuButton/MenuButton.tsx";
import "./GameModes.css";

export default function GameModes() {
  // Pobieramy roomId z adresu URL (zdefiniowanego w main.tsx jako /modes/:roomId)
  const { roomId } = useParams();

  const buttons = [
    { label: "PLAYLISTA", screen: `/play/playlist/${roomId}` },
    { label: "GATUNEK", screen: `/genres/${roomId}` },
    { label: "ARTYSTA", screen: `/play/artist/${roomId}` },
  ] as const;

  return (
    <div className="gamemodes-page">
      <h1 className="gamemodes-title">Wybierz tryb rozgrywki</h1>

      <div className="gamemodes-list">
        {buttons.map((btn) => (
          <MenuButton key={btn.label} label={btn.label} to={btn.screen} />
        ))}
      </div>
    </div>
  );
}