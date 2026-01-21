import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import { motion } from "framer-motion";
import "./Ranking.css";

export default function Profile() {
  const { user } = useAuth();
  
  const [soloStats, setSoloStats] = useState({
    percentage: 0, // Tylko procenty dla Solo
    games: 0,
    joinedAt: "",
  });

  const [multiStats, setMultiStats] = useState({
    totalPoints: 0, // Punkty tylko dla Multi
    games: 0,       // Możemy tu wyświetlać te same gry co w solo lub dodać osobny licznik w bazie
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      try {
        // Pobieramy dane z TRWAŁEJ tabeli Profiles
        const { data: profileData, error } = await supabase
          .from("Profiles")
          .select("games_played, guessed_percentage, points, createdAt")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (profileData) {
          // 1. STATYSTYKI SOLO (Tylko skuteczność %)
          setSoloStats({
            percentage: profileData.guessed_percentage || 0,
            games: profileData.games_played || 0,
            joinedAt: new Date(profileData.createdAt).toLocaleDateString(),
          });

          // 2. STATYSTYKI MULTI (Punkty z wszystkich gier lobby)
          setMultiStats({
            totalPoints: profileData.points || 0, // To pole magazynuje punkty z multi
            games: profileData.games_played || 0,
          });
        }
      } catch (err) {
        console.error("Błąd pobierania profilu:", err);
      }
    };

    fetchProfileData();
  }, [user]);

  if (!user) return null;

  return (
    <div className="ranking-master">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ranking-card"
        style={{ maxWidth: "800px", width: "95%", padding: "40px" }}
      >
        {/* NAGŁÓWEK */}
        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <div
            style={{
              width: "100px", height: "100px", borderRadius: "50%", background: "#4ade80",
              color: "black", fontSize: "3rem", fontWeight: "bold",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px auto", boxShadow: "0 0 25px #4ade80",
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

        {/* DWIE OSOBNE SEKCJE: SOLO (Skuteczność) i MULTI (Punkty) */}
        <div className="stats-grid">
          
          {/* KAFELEK SOLO - TYLKO PROCENTY */}
          <div style={statCardStyle}>
            <h2 style={{ color: "#4ade80", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", marginTop: 0 }}>
              👤 SOLO
            </h2>
            <div style={{ marginTop: "20px" }}>
              <p style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "5px" }}>SKUTECZNOŚĆ</p>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#fff" }}>
                {soloStats.percentage}%
              </div>
            </div>
            {/* Opcjonalnie liczba gier */}
            <div style={{ marginTop: "10px", fontSize: "0.9rem", color: "#888" }}>
              Rozegrane gry: {soloStats.games}
            </div>
          </div>

          {/* KAFELEK MULTI - TYLKO PUNKTY */}
          <div style={statCardStyle}>
            <h2 style={{ color: "#facc15", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", marginTop: 0 }}>
              🌐 MULTIPLAYER
            </h2>
            <div style={{ marginTop: "20px" }}>
              <p style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "5px" }}>TOTAL SCORE</p>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#facc15" }}>
                {multiStats.totalPoints}
              </div>
            </div>
             <div style={{ marginTop: "10px", fontSize: "0.9rem", color: "#888" }}>
               Punkty zdobyte w lobby
            </div>
          </div>
        </div>

        <div style={{ marginTop: "40px" }}>
          <MenuButton label="BACK TO MENU" to="/" external={false} />
        </div>
      </motion.div>

      <style>{`
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; }
        @media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

const statCardStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.4)", padding: "25px", borderRadius: "15px",
  border: "1px solid rgba(255,255,255,0.1)", boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)"
};