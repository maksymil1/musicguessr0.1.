import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import "./Ranking.css";

interface RankEntry {
  nickname: string;
  totalScore: number;
}

export default function Ranking() {
  const [topPlayers, setTopPlayers] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalRanking = async () => {
      setLoading(true);
      // Pobieramy dane z nowej tabeli GlobalRanking
      const { data, error } = await supabase
        .from("GlobalRanking")
        .select("nickname, totalScore")
        .order("totalScore", { ascending: false })
        .limit(20); // Top 20 graczy

      if (!error && data) {
        setTopPlayers(data);
      }
      setLoading(false);
    };

    fetchGlobalRanking();
  }, []);

  return (
    <div className="ranking-master">
      <div className="ranking-card">
        <h1 className="neon-text">GLOBAL LEGENDS</h1>
        <p className="subtitle">All-time best scores</p>
        
        {loading ? (
          <div className="loading-spinner">Loading legends...</div>
        ) : (
          <div className="ranking-list">
            {topPlayers.length > 0 ? (
              topPlayers.map((p, index) => (
                <div key={index} className="ranking-row">
                  <div className="rank-info">
                    <span className={`rank-number pos-${index + 1}`}>#{index + 1}</span>
                    <span className="nick-name">{p.nickname}</span>
                  </div>
                  <span className="points-value">{p.totalScore.toLocaleString()} PTS</span>
                </div>
              ))
            ) : (
              <div className="empty-state">No scores yet. Be the first!</div>
            )}
          </div>
        )}

        <div className="nav-footer">
          <MenuButton label="BACK TO HOME" to="/" external={false} />
        </div>
      </div>
    </div>
  );
}