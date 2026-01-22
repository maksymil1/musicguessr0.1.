import MenuButton from "../../components/MenuButton/MenuButton"; // Ensure the path is correct
import "./GameModes.css";

export default function Tryb() {
  return (
    <div className="gamemodes-page">
      <h1 className="gamemodes-title">Select Game Mode</h1>

      <div className="gamemodes-list">
        <MenuButton label="SINGLEPLAYER" to="singleplayer" />
        <MenuButton label="MULTIPLAYER" to="multiplayer" />
      </div>
    </div>
  );
}