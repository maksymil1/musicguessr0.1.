import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import { motion } from "framer-motion";
import "./Ranking.css"; // WAŻNE: To importuje wspólne style i tło

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [soloStats, setSoloStats] = useState({
    games: 0,
    percentage: 0,
    joinedAt: "",
  });

  const [multiStats, setMultiStats] = useState({
    games: 0,
    totalPoints: 0,
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      try {
        const myNick = user.user_metadata?.nickname;

        // 1. SINGLEPLAYER
        const { data: profileData } = await supabase
          .from("Profiles")
          .select("games_played, guessed_percentage, createdAt")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setSoloStats({
            games: profileData.games_played || 0,
            percentage: profileData.guessed_percentage || 0,
            joinedAt: new Date(profileData.createdAt).toLocaleDateString(),
          });
        }

        // 2. MULTIPLAYER
        if (myNick) {
          const { data: lobbyData } = await supabase
            .from("Player")
            .select("score")
            .eq("nickname", myNick);

          if (lobbyData) {
            const totalScore = lobbyData.reduce((acc, curr) => acc + (curr.score || 0), 0);
            setMultiStats({
              games: lobbyData.length,
              totalPoints: totalScore,
            });
          }
        }
      } catch (err) {
        console.error("Błąd profilu:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  if (!user) return null;

  return (
    // UŻYWAMY KLASY ranking-master ŻEBY MIEĆ TO SAMO TŁO CO RESZTA
    <div className="ranking-master">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ranking-card" // Styl szklanej karty
        style={{ 
          maxWidth: "800px", // Szersza karta żeby zmieścić dwie kolumny
          width: "95%",
          padding: "40px"
        }}
      >
        {/* NAGŁÓWEK */}
        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: "#4ade80",
              color: "black",
              fontSize: "3rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto",
              boxShadow: "0 0 25px #4ade80",
            }}
          >
            {user.user_metadata?.nickname?.[0]?.toUpperCase() || "U"}
          </div>
          <h1 className="neon-text" style={{ fontSize: "2.5rem", margin: 0 }}>
            {user.user_metadata?.nickname || "GRACZ"}
          </h1>
          <p style={{ color: "#888", marginTop: "5px", fontSize: "0.9rem" }}>
            Dołączył: {soloStats.joinedAt}
          </p>
        </div>

        {/* DWIE KOLUMNY STATYSTYK */}
        <div className="stats-grid">
          {/* KAFELEK SINGLE */}
          <div style={statCardStyle}>
            <h2 style={{ color: "#4ade80", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", marginTop: 0 }}>
              👤 SINGLE
            </h2>
            <div style={{ marginTop: "20px" }}>
              <p style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "5px" }}>SKUTECZNOŚĆ</p>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#fff" }}>
                {soloStats.percentage}%
              </div>
            </div>
            <div style={{ marginTop: "15px" }}>
              <p style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "5px" }}>GRY</p>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{soloStats.games}</div>
            </div>
          </div>

          {/* KAFELEK MULTI */}
          <div style={statCardStyle}>
            <h2 style={{ color: "#facc15", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", marginTop: 0 }}>
              🌐 MULTI
            </h2>
            <div style={{ marginTop: "20px" }}>
              <p style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "5px" }}>PUNKTY</p>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#facc15" }}>
                {multiStats.totalPoints}
              </div>
            </div>
            <div style={{ marginTop: "15px" }}>
              <p style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "5px" }}>MECZE</p>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{multiStats.games}</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "40px" }}>
          <MenuButton label="BACK TO MENU" to="/" external={false} />
        </div>
      </motion.div>

      {/* STYLE WEWNĘTRZNE + RESPANSYWNOŚĆ */}
      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          text-align: left;
        }
        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr; /* Na telefonie jeden pod drugim */
          }
        }
      `}</style>
    </div>
  );
}

const statCardStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.4)",
  padding: "25px",
  borderRadius: "15px",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)"
};