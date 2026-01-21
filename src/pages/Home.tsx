import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

import "./home.css";
import logo from "../assets/logo.png";
import speakerLeft from "../assets/speaker-left.png";
import speakerRight from "../assets/speaker-right.png";
import MenuButton from "../components/MenuButton/MenuButton.tsx";

export default function Home() {
  const { user, signOut, loading } = useAuth(); // Pobieranie danych z kontekstu

  // Główna lista przycisków na środku
  const buttons = useMemo(() => [
    { label: "PLAY", screen: "/tryb" },
    { label: "FRIENDS", screen: "/friends" },
    { label: "RANKING", screen: "/ranking" },
    { label: "EXPLORE", screen: "/search" },
  ], []);

  // Pobieramy nick z metadanych, jeśli nie ma - pokazujemy email jako fallback
  const userNick = user?.user_metadata?.nickname || user?.email; // Nickname zapisany podczas rejestracji

  return (
    <div className="master">
      
      {/* SEKCJA LOGOWANIA I PROFILU W PRAWYM GÓRNYM ROGU */}
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
              {/* IKONKA PROFILU JAKO ODNOŚNIK */}
              <NavLink 
                to="/profile" 
                style={{ 
                  textDecoration: 'none', 
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'transform 0.2s'
                }}
                className="profile-avatar-link"
                title="Przejdź do profilu"
              >
                👤
              </NavLink>

              {/* ZMIENIONE: Wyświetla NICK zamiast EMAIL */}
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{userNick}</span>
              
              <button onClick={signOut} className="logout-glass-btn">
                WYLOGUJ
              </button>
            </div>
          ) : (
            /* PRZYCISK LOGOWANIA DLA NIEZALOGOWANYCH */
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
        {/* Logo */}
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

      {/* Głośniki */}
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