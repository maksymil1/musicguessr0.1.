import { motion, AnimatePresence } from "framer-motion";

import { NavLink } from "react-router-dom";

import "./home.css"; // Zakładam, że style masz w tym pliku

import logo from "../assets/logo.png";

import nutaLeft from "../assets/nuta_left.png";

import nutaRight from "../assets/nuta_right.png";

import speakerLeft from "../assets/speaker-left.png";

import speakerRight from "../assets/speaker-right.png";

import { useState, useMemo } from "react";

import { useAuth } from "../context/AuthContext"; // Importujemy nasz nowy hook

export default function Home() {
  const [hovered, setHovered] = useState<number | null>(null);

  const { user } = useAuth(); // Sprawdzamy, czy użytkownik jest zalogowany

  // Używamy useMemo, aby przyciski odświeżyły się, gdy zmieni się stan 'user'

  const buttons = useMemo(() => {
    const baseButtons = [
      { label: "PLAY", screen: "/play", external: false },

      { label: "FRIENDS", screen: "/friends", external: false },

      {
        label: "SPOTIFY",

        screen: "https://apkamuzycznaio67-474923.ew.r.appspot.com/",

        external: true,
      },
    ];

    // Jeśli NIE ma użytkownika, dodaj przycisk LOGIN na początek lub koniec

    if (!user) {
      baseButtons.unshift({
        label: "LOGIN",

        screen: "/login",

        external: false,
      });
    }

    return baseButtons;
  }, [user]);

  return (
    <>
      <div className="master">
        <div className="home-container">
          <img src={logo} alt="MusicGuessr logo" className="logo" />

          {/* Opcjonalnie: komunikat powitalny */}

          {user && <p style={{ color: "white" }}>Witaj, {user.email}!</p>}

          <div className="buttons">
            {buttons.map((btn, index) => (
              <div
                key={btn.label}
                className="button-wrapper"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                {btn.external ? (
                  <a className="menu-button" href={btn.screen}>
                    {btn.label}
                  </a>
                ) : (
                  <NavLink className="menu-button" to={btn.screen}>
                    {btn.label}
                  </NavLink>
                )}

                <AnimatePresence>
                  {hovered === index && (
                    <motion.img
                      src={nutaLeft}
                      alt="notes"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="note-icon-left"
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {hovered === index && (
                    <motion.img
                      src={nutaRight}
                      alt="notes"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="note-icon-right"
                    />
                  )}
                </AnimatePresence>
              </div>
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
    </>
  );
}
