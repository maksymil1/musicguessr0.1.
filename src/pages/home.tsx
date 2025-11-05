import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./Home.css";

interface HomeProps {
  onNavigate: (screen: "home" | "play" | "friends" | "stats") => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const buttons = [
    { label: "PLAY", screen: "play" },
    { label: "FRIENDS", screen: "friends" },
    { label: "STATS", screen: "stats" },
  ] as const;

  return (
    <div className="home-container">
      {/* Logo /}
      <img src="/assets/logo.png" alt="MusicGuessr logo" className="logo" />

      {/ Przyciski */}
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
                  src="/assets/notes.png"
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
    </div>
  );
}
