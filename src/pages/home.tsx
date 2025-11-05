import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./home.css";

interface HomeProps {
  onNavigate: (screen: "home" | "play" | "friends" | "stats") => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const buttons = [
    { label: "PLAY", screen: "play" },
    { label: "FRIENDS", screen: "friends" },
    { label: "STATS", screen: "stats" },
  ]as const;

  return (
    <div className="home-container">
      {/* Głośniki */}
      <img src="/assets/speaker-left.png" alt="Left speaker" className="speaker left" />
      <img src="/assets/speaker-right.png" alt="Right speaker" className="speaker right" />

      {/* Logo */}
      <img src="/assets/logo.png" alt="MusicGuessr logo" className="logo" />

      {/* Przyciski */}
      <div className="buttons">
        {buttons.map((btn, index) => (
          <div
            key={btn.label}
            className="button-wrapper"
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            <button className="menu-button" onClick={() => onNavigate(btn.screen)}>
              {btn.label}
            </button>

            <AnimatePresence>
              {hovered === index && (
                <motion.img
                  src="/assets/nuta_left.png"
                  alt="notes"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="note-icon"
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Profil */}
      <img src="/assets/profile-icon.png" alt="Profile" className="profile-icon" />

      {/* Menu hamburger */}
      <div className="hamburger-menu">
        <div />
        <div />
        <div />
      </div>
    </div>
  );
}
