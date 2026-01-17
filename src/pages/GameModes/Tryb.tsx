import MenuButton from "../../components/MenuButton/MenuButton"; // Upewnij się co do ścieżki
import "./GameModes.css";

export default function Tryb() {
  return (
    <div className="gamemodes-page">
      <h1 className="gamemodes-title">Wybierz tryb rozgrywki</h1>

      <div className="gamemodes-list">
        <MenuButton label="SINGLEPLAYER" to="singleplayer" />
        <MenuButton label="MULTIPLAYER" to="multiplayer" />
      </div>
    </div>
  );
}
