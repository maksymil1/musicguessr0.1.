import MenuButton from "../components/MenuButton/MenuButton"; // Upewnij się co do ścieżki
import "./Results.css";

interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
}

interface ResultsProps {
  players: Player[];
  isHost: boolean;
  onRestart: () => void;
  onClose: () => void;
}

export default function Results({
  players,
  isHost,
  onRestart,
  onClose,
}: ResultsProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getRankDisplay = (index: number) => {
    if (index === 0) return "👑";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div className="results-container">
      <h1 className="results-header">GAME OVER</h1>

      <div className="results-card">
        <div className="results-list">
          {sortedPlayers.map((p, index) => (
            <div key={p.id} className={`result-row rank-${index + 1}`}>
              <div className="player-info">
                <span className="rank-badge">{getRankDisplay(index)}</span>
                <span className="player-name">
                  {p.nickname}
                  {p.isHost && <span className="is-host-icon">HOST</span>}
                </span>
              </div>
              <span className="player-score">{p.score} pkt</span>
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <div className="results-actions">
          {/* Owijamy MenuButton w div z onClick */}
          <div onClick={onRestart}>
            <MenuButton label="PLAY AGAIN" to="#" disabledLink />
          </div>

          <div onClick={onClose}>
            <MenuButton label="CLOSE ROOM" to="#" disabledLink />
          </div>
        </div>
      ) : (
        <p
          style={{
            marginTop: "20px",
            color: "#888",
            animation: "pulse 2s infinite",
          }}
        >
          Czekanie na decyzję Hosta...
        </p>
      )}
    </div>
  );
}