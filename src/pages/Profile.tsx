import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import MenuButton from "../components/MenuButton/MenuButton";
import AvatarUploader from "../components/AvatarUploader"; 
import { motion } from "framer-motion";
import "./Ranking.css";

export default function Profile() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [soloStats, setSoloStats] = useState({
    percentage: 0,
    games: 0,
    joinedAt: "",
  });

  const [multiStats, setMultiStats] = useState({
    totalPoints: 0,
    games: 0,
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      try {
        const { data: profileData, error } = await supabase
          .from("Profiles")
          .select("games_played, multi_games_played, guessed_percentage, points, createdAt, avatar_url")
          .eq("id", user.id)
          .single();

        if (error) {
           console.error("Error fetching profile:", error);
           return;
        }

        if (profileData) {
          setAvatarUrl(profileData.avatar_url);

          setSoloStats({
            percentage: profileData.guessed_percentage || 0,
            games: profileData.games_played || 0,
            joinedAt: new Date(profileData.createdAt).toLocaleDateString(),
          });

          setMultiStats({
            totalPoints: profileData.points || 0,
            games: profileData.multi_games_played || 0,
          });
        }
      } catch (err) {
        console.error("General error:", err);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleAvatarUpdate = async (newUrl: string) => {
    try {
      if (!user) return;
      if (avatarUrl && avatarUrl !== newUrl) {
        const oldFileName = avatarUrl.split("/avatars/").pop();
        if (oldFileName) {
           await supabase.storage.from("avatars").remove([oldFileName]);
        }
      }
      setAvatarUrl(newUrl);
      await supabase
        .from("Profiles")
        .update({ avatar_url: newUrl })
        .eq("id", user.id);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="ranking-master">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ranking-card"
        style={{ maxWidth: "800px", width: "95%", padding: "40px" }}
      >
        <div style={{ marginBottom: "40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <AvatarUploader 
            url={avatarUrl} 
            onUpload={handleAvatarUpdate} 
            size={100} 
          />
          <h1 className="neon-text" style={{ fontSize: "2.5rem", margin: "5px 0 0 0" }}>
            {user.user_metadata?.nickname || "PLAYER"}
          </h1>
          <p style={{ color: "#888", marginTop: "5px", fontSize: "0.9rem" }}>
            Joined: {soloStats.joinedAt}
          </p>
        </div>

        <div className="stats-grid">
          {/* SEKCJA SOLO - WSZYSTKO BIAŁE */}
          <div style={statCardStyle}>
            <h2 style={{ color: "#4ade80", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", marginTop: 0 }}>
              👤 SOLO
            </h2>
            <div style={{ marginTop: "20px" }}>
              <p style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "5px" }}>ACCURACY (GAMES)</p>
              <div style={{ fontSize: "2.2rem", fontWeight: "bold", color: "#4ade80" }}>
                {soloStats.percentage}% ({soloStats.games})
              </div>
            </div>
            <div style={{ marginTop: "10px", fontSize: "0.9rem", color: "#888" }}>
              Your single player performance
            </div>
          </div>

          {/* SEKCJA MULTI - WSZYSTKO ŻÓŁTE */}
          <div style={statCardStyle}>
            <h2 style={{ color: "#facc15", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", marginTop: 0 }}>
              🌐 MULTIPLAYER
            </h2>
            <div style={{ marginTop: "20px" }}>
              <p style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "5px" }}>TOTAL SCORE (GAMES)</p>
              <div style={{ fontSize: "2.2rem", fontWeight: "bold", color: "#facc15" }}>
                {multiStats.totalPoints.toLocaleString()} ({multiStats.games})
              </div>
            </div>
             <div style={{ marginTop: "10px", fontSize: "0.9rem", color: "#888" }}>
                Points earned in global lobbies
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