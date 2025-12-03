import MenuButton from "../components/MenuButton/MenuButton.tsx";
import "./GameModes.css";

export default function GameModes() {
  const buttons = [
    { label: "PLAYLISTA", screen: "/play/playlist" },
    { label: "GATUNEK", screen: "/play/genre" },
    { label: "ARTYSTA", screen: "/play/artist" },
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
