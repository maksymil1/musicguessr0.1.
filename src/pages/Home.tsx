import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

import "./home.css";
import logo from "../assets/logo.png";
import nutaLeft from "../assets/nuta_left.png";
import nutaRight from "../assets/nuta_right.png";
import speakerLeft from "../assets/speaker-left.png";
import speakerRight from "../assets/speaker-right.png";

export default function Home() {
  const [hovered, setHovered] = useState<number | null>(null);
  const { user, signOut, loading } = useAuth();

  const buttons = useMemo(() => {
    const list = [
      { label: "PLAY", screen: "/play" },
      { label: "FRIENDS", screen: "/friends" },
      { label: "RANKING", screen: "/ranking" },
      { label: "SPOTIFY", screen: "https://apkamuzycznaio67-474923.ew.r.appspot.com/", external: true },
    ];
    if (!loading && !user) list.unshift({ label: "LOGIN", screen: "/login" });
    return list;
  }, [user, loading]);

  return (
    <div className="master">
      {/* Pasek profilu */}
      {!loading && user && (
        <div className="user-glass-panel">
          <span style={{color: '#4ade80'}}>👤 {user.email}</span>
          <button onClick={signOut} className="logout-glass-btn">WYLOGUJ</button>
        </div>
      )}

      <div className="home-container">
        {/* LOGO WYSOKO I DUŻE */}
        <img src={logo} alt="MusicGuessr" className="logo" />

        <div className="buttons">
          {!loading && buttons.map((btn, index) => (
            <div key={btn.label} className="button-wrapper"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}>
              {btn.external ? (
                <a className="menu-button" href={btn.screen} target="_blank" rel="noreferrer">{btn.label}</a>
              ) : (
                <NavLink className="menu-button" to={btn.screen}>{btn.label}</NavLink>
              )}
              
              <AnimatePresence>
                {hovered === index && (
                  <>
                    <motion.img src={nutaLeft} className="note-icon-left" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} />
                    <motion.img src={nutaRight} className="note-icon-right" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} />
                  </>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <div className="speakers-container">
        <div className="speaker-left"><img src={speakerLeft} alt="L" /></div>
        <div className="speaker-right"><img src={speakerRight} alt="R" /></div>
      </div>
    </div>
  );
}