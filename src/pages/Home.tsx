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

  // useMemo pozwala dynamicznie zarządzać listą przycisków (np. LOGIN pojawia się tylko gdy brak usera)
  const buttons = useMemo(() => {
    const list = [
      { label: "PLAY", screen: "/tryb" },     // Zmieniono z /play na /tryb
      { label: "FRIENDS", screen: "/friends" },
      { label: "RANKING", screen: "/ranking" },
      { label: "EXPLORE", screen: "/search" }, // W miejsce Spotify wchodzi Explore
    ];

    // Dodaj LOGIN na początek, jeśli użytkownik nie jest zalogowany
    if (!loading && !user) {
      list.unshift({ label: "LOGIN", screen: "/login" });
    }
    return list;
  }, [user, loading]);

  return (
    <div className="master">
      {/* Pasek profilu - zachowany z poprzedniej wersji */}
      {!loading && user && (
        <div className="user-glass-panel">
          <span style={{ color: '#4ade80' }}>👤 {user.email}</span>
          <button onClick={signOut} className="logout-glass-btn">WYLOGUJ</button>
        </div>
      )}

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