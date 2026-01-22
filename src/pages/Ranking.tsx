import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import { motion, AnimatePresence } from "framer-motion";
import "./Ranking.css";

interface RankEntry {
  id: string;
  nickname: string;
  points: number;
  avatar_url?: string;
  guessed_percentage: number;
  games_played: number;
}

export default function Ranking() {
  const [topPlayers, setTopPlayers] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGlobalRanking = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("Profiles")
        .select("id, nickname, points, avatar_url, guessed_percentage, games_played")
        .order("points", { ascending: false })
        .limit(5);

      if (error) throw error;
      if (data) setTopPlayers(data);
    } catch (err) {
      console.error("Ranking fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalRanking();
  }, [fetchGlobalRanking]);

  return (
    <div className="friends-container-pro">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ranking-glass-box-large"
      >
        <header className="ranking-header-new">
          <h1 className="neon-text">GLOBAL LEGENDS</h1>
          <p className="subtitle">TOP 5 PLAYERS</p>
        </header>

        <div className="ranking-content-fill">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {topPlayers.map((player, index) => (
                <RankRow key={player.id} player={player} index={index} />
              ))}
            </AnimatePresence>
          )}
        </div>

        <footer className="friends-footer">
          <MenuButton label="BACK TO MENU" to="/" />
        </footer>
      </motion.div>
    </div>
  );
}

function RankRow({ player, index }: { player: RankEntry; index: number }) {
  const getRankEmoji = (idx: number) => {
    if (idx === 0) return "👑";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return `#${idx + 1}`;
  };

  return (
    <motion.div 
      className={`ranking-row-stretched rank-top-${index + 1}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="avatar-ranking" style={{ borderColor: index === 0 ? '#ffd700' : 'rgba(255,255,255,0.1)' }}>
          {player.avatar_url ? (
            <img src={player.avatar_url} alt={player.nickname} />
          ) : (
            <span style={{ fontWeight: 'bold' }}>{player.nickname[0].toUpperCase()}</span>
          )}
        </div>

        <div className="player-info-container">
          <div className="player-nick-row">
            <span style={{ marginRight: '8px' }}>{getRankEmoji(index)}</span>
            {player.nickname}
          </div>
          <div className="player-stats-row">
            <span>🎯 <span className="stat-val">{player.guessed_percentage}%</span></span>
            <span>🎮 <span className="stat-val">{player.games_played}</span></span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right', minWidth: '100px' }}>
        <div className="points-value">{player.points.toLocaleString()}</div>
        <div className="points-label">TOTAL PTS</div>
      </div>
    </motion.div>
  );
}