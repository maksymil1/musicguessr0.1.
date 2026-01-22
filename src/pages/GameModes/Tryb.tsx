import MenuButton from "../../components/MenuButton/MenuButton"; 
import "./GameModes.css";

export default function Tryb() {
  return (
    <div className="gamemodes-page">
      {/* Kontener na górną treść */}
      <div className="gamemodes-content">
        <h1 className="gamemodes-title">Select Game Mode</h1>

        <div className="gamemodes-list">
          <MenuButton label="SINGLEPLAYER" to="singleplayer" />
          <MenuButton label="MULTIPLAYER" to="multiplayer" />
        </div>
      </div>

      {/* Stopka z dużym odstępem */}
      <div className="friends-footer" style={{ marginTop: "100px", borderTop: "none" }}>
        <MenuButton label="BACK TO MENU" to="/" external={false} />
      </div>
    </div>
  );
}