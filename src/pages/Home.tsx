import { NavLink } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";

import "./home.css";
import logo from "../assets/logo.png";
import speakerLeft from "../assets/speaker-left.png";
import speakerRight from "../assets/speaker-right.png";
import MenuButton from "../components/MenuButton/MenuButton.tsx";

export default function Home() {
  const { user, signOut, loading } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Pobieramy awatar użytkownika, jeśli jest zalogowany
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("Profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [user]);

  const buttons = useMemo(() => [
    { label: "PLAY", screen: "/tryb" },
    { label: "FRIENDS", screen: "/friends" },
    { label: "RANKING", screen: "/ranking" },
    { label: "EXPLORE", screen: "/search" },
  ], []);

  const userNick = user?.user_metadata?.nickname || user?.email;

  return (
    <div className="master">
      
      {/* SEKCJA LOGOWANIA I PROFILU */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px', 
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}>
        {!loading && (
          user ? (
            /* PANEL ZALOGOWANEGO UŻYTKOWNIKA */
            <div className="user-glass-panel" style={{ 
              position: 'static',
              display: 'flex',
              alignItems: 'center',
              gap: '15px' 
            }}>
              {/* IKONKA PROFILU Z AWATAREM */}
              <NavLink 
                to="/profile" 
                style={{ 
                  textDecoration: 'none', 
                  display: 'block',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}
                className="profile-avatar-link"
                title="Przejdź do profilu"
              >
                <div style={{
                  width: '45px',
                  height: '45px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #4ade80',
                  background: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <span style={{ fontSize: '1.2rem' }}>👤</span>
                  )}
                </div>
              </NavLink>

              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{userNick}</span>
              
              <button onClick={signOut} className="logout-glass-btn">
                WYLOGUJ
              </button>
            </div>
          ) : (
            <NavLink 
              to="/login" 
              className="menu-button" 
              style={{ 
                fontSize: '1rem',
                padding: '5px 20px',
                minWidth: 'auto',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)' 
              }}
            >
              LOGIN
            </NavLink>
          )
        )}
      </div>

      <div className="home-container">
        <img src={logo} alt="MusicGuessr logo" className="logo" />

        <div className="buttons">
          {!loading && buttons.map((btn) => (
            <MenuButton 
              key={btn.label} 
              label={btn.label} 
              to={btn.screen} 
            />
          ))}
        </div>
      </div>

      <div className="speakers-container">
        <div className="speaker-left">
          <img src={speakerLeft} alt="Left speaker" />
        </div>
        <div className="speaker-right">
          <img src={speakerRight} alt="Right speaker" />
        </div>
      </div>
    </div>
  );
}