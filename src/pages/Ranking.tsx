import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import "./Ranking.css";

// --- TYPY ---
interface RankEntry {
  nickname: string;
  points: number; // Zmieniliśmy totalScore na points, żeby pasowało do bazy
}

export default function Ranking() {
  const [topPlayers, setTopPlayers] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- POBIERANIE DANYCH Z PROFILES ---
  const fetchGlobalRanking = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // ZMIANA: Pobieramy z "Profiles" zamiast "GlobalRanking"
      // Sortujemy po kolumnie "points" (punkty multiplayer)
      const { data, error: sbError } = await supabase
        .from("Profiles")
        .select("nickname, points")
        .order("points", { ascending: false })
        .limit(5);

      if (sbError) throw sbError;
      
      if (data) {
        // Mapujemy dane, żeby upewnić się że typy są zgodne (choć tutaj są 1:1)
        const mappedData = data.map((player: any) => ({
          nickname: player.nickname,
          points: player.points || 0
        }));
        setTopPlayers(mappedData);
      }
    } catch (err: any) {
      console.error("Ranking fetch error:", err);
      setError("Failed to load ranking. Try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalRanking();
  }, [fetchGlobalRanking]);

  // --- WARIANTY ANIMACJI ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="ranking-master">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ranking-card"
      >
        <header className="ranking-header">
          <h1 className="neon-text">GLOBAL LEGENDS</h1>
          <p className="subtitle">Top 5 Multiplayer Scores</p>
        </header>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading legends...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchGlobalRanking}>RETRY</button>
          </div>
        ) : (
          <motion.div 
            className="ranking-list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {topPlayers.length > 0 ? (
              topPlayers.map((player, index) => (
                <RankRow 
                  key={`${player.nickname}-${index}`} 
                  player={player} 
                  index={index} 
                  variants={itemVariants}
                />
              ))
            ) : (
              <div className="empty-state">No scores yet. Be the first!</div>
            )}
          </motion.div>
        )}

        <footer className="nav-footer">
          <MenuButton label="BACK TO HOME" to="/" external={false} />
        </footer>
      </motion.div>
    </div>
  );
}

// --- SUBKOMPONENT WIERSZA ---
function RankRow({ player, index, variants }: { player: RankEntry, index: number, variants: any }) {
  const getRankClass = (idx: number) => {
    if (idx === 0) return "rank-gold";
    if (idx === 1) return "rank-silver";
    if (idx === 2) return "rank-bronze";
    return "";
  };

  return (
    <motion.div variants={variants} className={`ranking-row ${getRankClass(index)}`}>
      <div className="rank-info">
        <span className={`rank-number pos-${index + 1}`}>
          {index + 1 === 1 ? "🥇" : index + 1 === 2 ? "🥈" : index + 1 === 3 ? "🥉" : `#${index + 1}`}
        </span>
        <span className="nick-name">{player.nickname}</span>
      </div>
      <div className="rank-score">
        <span className="points-value">{player.points.toLocaleString()}</span>
        <span className="points-label">PTS</span>
      </div>
    </motion.div>
  );
}