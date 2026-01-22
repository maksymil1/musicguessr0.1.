import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useVolume } from "../context/VolumeContext";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import "./Ranking.css";

const LEVELS = [0.1, 0.5, 1, 3, 7, 15, 30];
const POINTS_PER_LEVEL = [100, 80, 60, 40, 20, 10, 5];

// --- EXTENDED LISTS ---
const GENRES = [
  "Pop", "Hip-Hop", "Rap", "Rock", "Alternative", "Electronic", 
  "Dance", "R&B", "Soul", "Metal", "Jazz", "Classical", 
  "Reggae", "K-Pop", "Latino", "Indie", "Country", "Blues", 
  "Folk", "Punk", "Techno", "House", "Disco", "Funk", 
  "Gospel", "Soundtrack", "Trap", "Grunge"
];

const DECADES = [
  "2024", "2023", "2020s", "2010s", 
  "2000s", "1990s", "1980s", "1970s", "1960s", "1950s"
];

export default function Solo() {
  const { user } = useAuth();
  const { volume, isMuted } = useVolume();
  
  const [targetTrack, setTargetTrack] = useState<any>(null);
  const [gameState, setGameState] = useState<"setup" | "playing" | "result">("setup");
  
  // Setup state
  const [category, setCategory] = useState<"popular" | "artist" | "genre" | "years">("popular");
  const [subValue, setSubValue] = useState(""); // Stores selected genre/year/artist

  // Gameplay state
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [guess, setGuess] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [attemptsHistory, setAttemptsHistory] = useState<any[]>([]);
  const [playedIds, setPlayedIds] = useState<number[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- VOLUME SYNC ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const normalizeText = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

  // --- AUTOCOMPLETE ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (guess.length > 2) {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(guess)}&entity=song&limit=6`
        );
        const data = await res.json();
        setSuggestions(data.results || []);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [guess]);

  const saveGameResult = async (isWin: boolean, pointsEarned: number) => {
    if (!user) return;
    try {
      const { data: profile, error } = await supabase
        .from("Profiles")
        .select("games_played, points, guessed_percentage")
        .eq("id", user.id)
        .single();

      if (error || !profile) return;

      const currentGames = profile.games_played || 0;
      const currentPct = profile.guessed_percentage || 0;
      let wins = Math.round((currentGames * currentPct) / 100);

      const newGames = currentGames + 1;
      if (isWin) wins += 1;
      
      const newPct = Math.round((wins / newGames) * 100);
      const newPoints = (profile.points || 0) + pointsEarned;

      await supabase
        .from("Profiles")
        .update({ games_played: newGames, guessed_percentage: newPct, points: newPoints })
        .eq("id", user.id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrack = async () => {
    // Validation before start
    if ((category === "artist" || category === "genre" || category === "years") && !subValue) {
        alert("Please select an option (Artist, Genre, or Year) before starting!");
        return;
    }

    setGameState("setup");
    setAttemptsHistory([]);
    setFeedback("");
    try {
      let searchTerm = "";
      // Enhanced queries
      if (category === "popular") searchTerm = "top charts hits 2024";
      else if (category === "artist") searchTerm = subValue;
      else if (category === "genre") searchTerm = `best ${subValue} songs`;
      else if (category === "years") searchTerm = `top hits ${subValue}`;

      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=200`
      );
      const data = await res.json();
      
      let available = data.results.filter((t: any) => {
        const name = t.trackName.toLowerCase();
        return !playedIds.includes(t.trackId) && !name.includes("karaoke") && !name.includes("tribute");
      });

      if (category === "artist") {
        available = available.filter((t: any) => t.artistName.toLowerCase().includes(subValue.toLowerCase()));
      }

      if (available.length === 0) return alert("No tracks found for this query!");

      const track = available[Math.floor(Math.random() * available.length)];

      setTargetTrack({
        id: track.trackId,
        name: track.trackName,
        cleanName: track.trackName.split("(")[0].split("feat")[0].trim(),
        artist: track.artistName,
        preview: track.previewUrl,
        cover: track.artworkUrl100,
      });
      setPlayedIds((prev) => [...prev, track.trackId]);
      setGameState("playing");
      setCurrentAttempt(0);
      setGuess("");
    } catch (e) {
      setFeedback("Connection error.");
    }
  };

  const handleGuess = (selectedTitle?: string) => {
    const finalGuess = selectedTitle || guess;
    if (!finalGuess) return;
    const normGuess = normalizeText(finalGuess);
    const normFull = normalizeText(targetTrack.name);
    const normClean = normalizeText(targetTrack.cleanName);

    if (normGuess === normFull || normGuess === normClean || normFull.startsWith(normGuess)) {
      setGameState("result");
      setFeedback("CORRECT!");
      saveGameResult(true, POINTS_PER_LEVEL[currentAttempt] || 5);
    } else {
      setAttemptsHistory((prev) => [...prev, finalGuess]);
      setGuess("");
      setSuggestions([]);
      if (currentAttempt < LEVELS.length - 1) {
        setCurrentAttempt((prev) => prev + 1);
        setFeedback("Wrong! Time increased.");
      } else {
        setGameState("result");
        setFeedback("GAME OVER");
        saveGameResult(false, 0);
      }
    }
  };

  const playPreview = () => {
    if (!audioRef.current || isPlaying) return;
    
    audioRef.current.volume = isMuted ? 0 : volume / 100;
    
    setIsPlaying(true);
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setTimeout(() => {
      audioRef.current?.pause();
      setIsPlaying(false);
    }, LEVELS[currentAttempt] * 1000);
  };

  return (
    <div className="ranking-master">
      <div className="ranking-card" style={{ maxWidth: "600px", minHeight: "700px", display: "flex", flexDirection: "column" }}>
        <h1 className="neon-text">SONGLESS</h1>

        {gameState === "setup" ? (
          <div className="setup-section" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
             
             {/* 1. CATEGORIES - TAB STYLE */}
             <div className="category-tabs">
                <button onClick={() => { setCategory("popular"); setSubValue(""); }} className={category === "popular" ? "tab-active" : "tab-off"}>TOP HITS</button>
                <button onClick={() => { setCategory("artist"); setSubValue(""); }} className={category === "artist" ? "tab-active" : "tab-off"}>ARTIST</button>
                <button onClick={() => { setCategory("genre"); setSubValue(""); }} className={category === "genre" ? "tab-active" : "tab-off"}>GENRE</button>
                <button onClick={() => { setCategory("years"); setSubValue(""); }} className={category === "years" ? "tab-active" : "tab-off"}>YEARS</button>
             </div>

             {/* 2. DETAIL SELECTION */}
             <div style={{ flex: 1, overflowY: "auto", marginBottom: "20px", paddingRight: "5px" }} className="custom-scrollbar">
                
                {/* ARTIST - Glass Input */}
                {category === "artist" && (
                    <div className="search-bar-container">
                        <span className="search-icon">🎤</span>
                        <input 
                            type="text" 
                            placeholder="Type e.g. The Weeknd..." 
                            value={subValue} 
                            onChange={(e) => setSubValue(e.target.value)} 
                            className="search-input"
                        />
                    </div>
                )}

                {/* GENRES - Chips */}
                {category === "genre" && (
                    <div className="chips-grid">
                        {GENRES.map(g => (
                            <button 
                                key={g} 
                                onClick={() => setSubValue(g)} 
                                className={`chip-btn ${subValue === g ? "chip-selected" : ""}`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                )}

                {/* YEARS - Chips */}
                {category === "years" && (
                    <div className="chips-grid">
                        {DECADES.map(d => (
                            <button 
                                key={d} 
                                onClick={() => setSubValue(d)} 
                                className={`chip-btn ${subValue === d ? "chip-selected-yellow" : ""}`}
                                style={{ borderColor: subValue === d ? "#facc15" : "rgba(255,255,255,0.1)", color: subValue === d ? "black" : "#facc15" }}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                )}

                {category === "popular" && (
                    <div style={{textAlign: "center", padding: "20px", color: "#aaa", fontStyle: "italic"}}>
                        Mixed mode. Random hits from the charts.
                    </div>
                )}
             </div>

             <button onClick={() => fetchTrack()} className="menu-button" style={{ background: "#4ade80", color: "#000", width: "100%", fontSize: "1.2rem" }}>START GAME</button>
          </div>
        ) : gameState === "playing" ? (
          <div className="game-container">
            <div className="progress-container" style={{ display: "flex", gap: "2px", height: "12px", background: "#222", marginBottom: "20px" }}>
              {LEVELS.map((level, idx) => (
                <div key={idx} style={{ flex: level, background: idx <= currentAttempt ? "#4ade80" : "#444", borderRight: "1px solid #111" }} />
              ))}
            </div>
            
            <div className="history-list" style={{ marginBottom: "20px" }}>
              {[...Array(LEVELS.length)].map((_, idx) => (
                <div key={idx} className="history-item" style={{ height: "35px", border: "1px solid #333", marginBottom: "5px", display: "flex", alignItems: "center", padding: "0 10px", fontSize: "0.8rem", background: attemptsHistory[idx] ? "rgba(255, 71, 87, 0.15)" : "transparent", color: attemptsHistory[idx] ? "#ff4757" : "#555" }}>
                  {attemptsHistory[idx] || (idx === currentAttempt ? "YOUR ATTEMPT..." : "")}
                </div>
              ))}
            </div>
            
            <button onClick={playPreview} className="play-btn-large">{isPlaying ? "..." : "▶"}</button>
            
            <div style={{ position: "relative", marginTop: "20px" }}>
              <input type="text" placeholder="Know the title?" value={guess} onChange={(e) => setGuess(e.target.value)} autoComplete="off" style={inputStyle} onKeyDown={(e) => e.key === "Enter" && handleGuess()} />
              {suggestions.length > 0 && (
                <div className="suggestions-box">
                  {suggestions.map((s: any) => (
                    <div key={s.trackId} className="suggestion-item" onClick={() => handleGuess(s.trackName)}>{s.trackName} - {s.artistName}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => handleGuess()} className="action-btn-green">SUBMIT</button>
              <button onClick={() => handleGuess("SKIPPED")} className="action-btn-gray">SKIP</button>
            </div>
            <audio ref={audioRef} src={targetTrack.preview} />
          </div>
        ) : (
          <div className="result-container animate-fade-in">
            <h2 style={{ color: feedback === "CORRECT!" ? "#4ade80" : "#ff4757", fontSize: "2rem" }}>{feedback}</h2>
            {feedback === "CORRECT!" && <p style={{color: '#ffd700', fontWeight: 'bold', fontSize: "1.5rem"}}>+{POINTS_PER_LEVEL[currentAttempt]} PTS</p>}
            
            <img src={targetTrack.cover} style={{ width: "200px", borderRadius: "15px", margin: "20px 0", boxShadow: "0 0 30px rgba(74,222,128,0.2)" }} alt="Track cover" />
            
            <p style={{ fontSize: "1.5rem", marginBottom: "5px" }}><strong>{targetTrack.name}</strong></p>
            <p style={{ color: "#aaa", fontSize: "1.1rem" }}>{targetTrack.artist}</p>
            
            <button onClick={() => fetchTrack()} className="menu-button" style={{ background: "#4ade80", color: "#000", marginTop: "30px", width: "100%" }}>KEEP PLAYING</button>
          </div>
        )}
        
        <div style={{ paddingTop: "20px", alignSelf: "center" }}><MenuButton label="EXIT" to="/" external={false} /></div>
      </div>

      <style>{`
        /* TAB AND INPUT STYLES */
        .category-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 20px;
          background: rgba(0,0,0,0.3);
          padding: 5px;
          border-radius: 12px;
        }
        .tab-active { background: #4ade80; color: black; border: none; padding: 8px; border-radius: 8px; font-weight: bold; font-size: 0.8rem; cursor: default; }
        .tab-off { background: transparent; color: #aaa; border: none; padding: 8px; border-radius: 8px; font-size: 0.8rem; cursor: pointer; transition: 0.2s; }
        .tab-off:hover { background: rgba(255,255,255,0.1); color: white; }

        .chips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 10px; }
        .chip-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #ccc; padding: 10px 5px; border-radius: 10px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
        .chip-btn:hover { border-color: #4ade80; color: white; }
        .chip-selected { background: #4ade80 !important; color: black !important; border-color: #4ade80 !important; font-weight: bold; }
        .chip-selected-yellow { background: #facc15 !important; color: black !important; border-color: #facc15 !important; font-weight: bold; }

        .search-bar-container { display: flex; align-items: center; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; padding: 10px; transition: all 0.3s ease; }
        .search-bar-container:focus-within { border-color: #4ade80; box-shadow: 0 0 15px rgba(74, 222, 128, 0.2); background: rgba(0, 0, 0, 0.6); }
        .search-input { flex: 1; background: transparent; border: none; color: white; font-size: 1rem; outline: none; margin-left: 10px; }

        .play-btn-large { width: 80px; height: 80px; border-radius: 50%; background: #4ade80; border: none; font-size: 1.8rem; cursor: pointer; display: block; margin: 0 auto; transition: 0.2s; color: black; }
        .play-btn-large:hover { transform: scale(1.1); box-shadow: 0 0 20px #4ade80; }
        
        .suggestions-box { position: absolute; bottom: 100%; left: 0; right: 0; background: #222; border: 1px solid #444; z-index: 10; max-height: 200px; overflow-y: auto; border-radius: 10px; }
        .suggestion-item { padding: 12px; cursor: pointer; border-bottom: 1px solid #333; font-size: 0.9rem; text-align: left; }
        .suggestion-item:hover { background: #333; color: #4ade80; }

        .action-btn-green { flex: 1; padding: 15px; background: #4ade80; color: #000; border: none; font-weight: bold; cursor: pointer; border-radius: 8px; font-size: 1rem; }
        .action-btn-gray { flex: 1; padding: 15px; background: #333; color: #fff; border: none; cursor: pointer; border-radius: 8px; font-size: 1rem; }
      `}</style>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "15px", background: "#111", color: "#fff", border: "1px solid #4ade80", borderRadius: "10px", fontSize: "1rem" };