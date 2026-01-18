import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

import "./home.css";
import logo from "../assets/logo.png";
import speakerLeft from "../assets/speaker-left.png";
import speakerRight from "../assets/speaker-right.png";
import MenuButton from "../components/MenuButton/MenuButton.tsx";

export default function Home() {
  const { user, signOut, loading } = useAuth();

  // Główna lista przycisków na środku (bez LOGIN)
  const buttons = useMemo(() => [
    { label: "PLAY", screen: "/tryb" },
    { label: "FRIENDS", screen: "/friends" },
    { label: "RANKING", screen: "/ranking" },
    { label: "EXPLORE", screen: "/search" },
  ], []);

  return (
    <div className="master">
      
      {/* SEKCJA LOGOWANIA W PRAWYM GÓRNYM ROGU */}
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
            <div className="user-glass-panel" style={{ position: 'static' }}>
              <span style={{ color: '#4ade80' }}>👤 {user.email}</span>
              <button onClick={signOut} className="logout-glass-btn">WYLOGUJ</button>
            </div>
          ) : (
            <NavLink 
              to="/login" 
              className="menu-button" 
              style={{ 
                fontSize: '1rem',      /* Mniejszy tekst */
                padding: '5px 20px',   /* Mniejszy kafelek */
                minWidth: 'auto',      /* Nie tak szeroki jak te na środku */
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