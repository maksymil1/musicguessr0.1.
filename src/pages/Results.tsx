import { motion, AnimatePresence } from "framer-motion";
import MenuButton from "../components/MenuButton/MenuButton";
import "./Results.css";

interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  avatar_url?: string;
}

interface ResultsProps {
  players: Player[];
  isHost: boolean;
  onRestart: () => void;
  onClose: () => void;
}

export default function Results({ players, isHost, onRestart, onClose }: ResultsProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="friends-container-pro">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="friends-glass-box results-box-premium"
      >
        <header className="results-header-premium">
          <h1 className="neon-text-gold">FINAL STANDINGS</h1>
          <p className="subtitle">THE LEGENDS HAVE SPOKEN</p>
        </header>

        <div className="results-scroll-area">
          <AnimatePresence mode="popLayout">
            {sortedPlayers.map((p, index) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`result-row-premium rank-step-${index + 1}`}
              >
                <div className="player-meta-main">
                  <div className="rank-badge-premium">
                    {index === 0 ? "👑" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </div>
                  
                  <div className="avatar-ranking" style={{ 
                    borderColor: index === 0 ? '#facc15' : 'rgba(255,255,255,0.1)'
                  }}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.nickname} className="avatar-img" />
                    ) : (
                      <span className="avatar-placeholder">{p.nickname[0].toUpperCase()}</span>
                    )}
                  </div>

                  <div className="nick-section">
                    <span className="player-name-text">
                      {p.nickname}
                      {p.isHost && <span className="host-tag-mini">HOST</span>}
                    </span>
                    {index === 0 && <span className="winner-label">CHAMPION</span>}
                  </div>
                </div>

                <div className="score-section-premium">
                  <div className="points-container-flex">
                    <span className="points-value-large">{p.score.toLocaleString()}</span>
                    <span className="points-label">PTS</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <footer className="results-footer-premium">
          {isHost ? (
            <div className="results-actions-stack">
              <div onClick={onRestart} className="action-wrapper">
                <MenuButton label="REMATCH" to="#" disabledLink />
              </div>
              <div onClick={onClose} className="action-wrapper">
                <MenuButton label="CLOSE LOBBY" to="#" disabledLink />
              </div>
            </div>
          ) : (
            <div className="waiting-host-box">
              <div className="loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </div>
              <p className="waiting-text-premium">Waiting for host to decide your fate</p>
            </div>
          )}
        </footer>
      </motion.div>
    </div>
  );
}