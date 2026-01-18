import { useState, useEffect, useRef } from "react";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import "./Ranking.css";

const LEVELS = [0.1, 0.5, 1, 3, 7, 15, 30];

export default function Solo() {
  const [targetTrack, setTargetTrack] = useState<any>(null);
  const [gameState, setGameState] = useState<"setup" | "playing" | "result">(
    "setup"
  );
  const [category, setCategory] = useState<
    "popular" | "artist" | "genre" | "years"
  >("popular");
  const [subValue, setSubValue] = useState("");

  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [guess, setGuess] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [attemptsHistory, setAttemptsHistory] = useState<any[]>([]);
  const [playedIds, setPlayedIds] = useState<number[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (guess.length > 2) {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            guess
          )}&entity=song&limit=6`
        );
        const data = await res.json();
        setSuggestions(data.results || []);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [guess]);

  const fetchTrack = async () => {
    setGameState("setup");
    setAttemptsHistory([]);
    setFeedback("");

    try {
      let searchTerm = "";
      // Dynamiczne budowanie zapytania na podstawie wybranej kategorii
      if (category === "popular") searchTerm = "top charts hits";
      else if (category === "artist") searchTerm = subValue;
      else if (category === "genre") searchTerm = subValue + " hits";
      else if (category === "years") searchTerm = subValue + " hits";

      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          searchTerm
        )}&entity=song&limit=200`
      );
      const data = await res.json();

      let available = data.results.filter((t: any) => {
        const name = t.trackName.toLowerCase();
        const isForbidden =
          name.includes("workout") ||
          name.includes("remix") ||
          name.includes("edit") ||
          name.includes("live") ||
          name.includes("version") ||
          name.includes("tribute") ||
          name.includes("instrumental");
        return !playedIds.includes(t.trackId) && !isForbidden;
      });

      if (category === "artist") {
        available = available.filter(
          (t: any) => t.artistName.toLowerCase() === subValue.toLowerCase()
        );
      }

      const track = available[Math.floor(Math.random() * available.length)];
      if (!track) return alert("Brak nowych utworów w tej kategorii!");

      console.log("DEBUG - POPRAWNA ODPOWIEDŹ:", track.trackName);

      setTargetTrack({
        id: track.trackId,
        name: track.trackName,
        cleanName: track.trackName
          .split("(")[0]
          .split("[")[0]
          .split("feat")[0]
          .split("ft.")[0]
          .trim(),
        artist: track.artistName,
        preview: track.previewUrl,
        cover: track.artworkUrl100,
      });
      setPlayedIds((prev) => [...prev, track.trackId]);
      setGameState("playing");
      setCurrentAttempt(0);
      setGuess("");
    } catch (e) {
      setFeedback("Błąd połączenia.");
    }
  };

  const handleGuess = (selectedTitle?: string) => {
    const finalGuess = selectedTitle || guess;
    if (!finalGuess) return;

    const normGuess = normalizeText(finalGuess);
    const normFull = normalizeText(targetTrack.name);
    const normClean = normalizeText(targetTrack.cleanName);

    const isCorrect =
      normGuess === normFull ||
      normGuess === normClean ||
      normFull.startsWith(normGuess) ||
      normClean.startsWith(normGuess);

    if (isCorrect) {
      setGameState("result");
      setFeedback("CORRECT!");
    } else {
      setAttemptsHistory((prev) => [...prev, finalGuess]);
      setGuess("");
      setSuggestions([]);
      if (currentAttempt < LEVELS.length - 1) {
        setCurrentAttempt((prev) => prev + 1);
        setFeedback("Źle! Czas zwiększony.");
      } else {
        setGameState("result");
        setFeedback("GAME OVER");
      }
    }
  };

  const playPreview = () => {
    if (!audioRef.current || isPlaying) return;
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
      <div
        className="ranking-card"
        style={{ maxWidth: "600px", minHeight: "650px" }}
      >
        <h1 className="neon-text">SONGLESS</h1>

        {gameState === "setup" ? (
          <div className="setup-section">
            <div
              className="category-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <button
                onClick={() => {
                  setCategory("popular");
                  setSubValue("");
                }}
                className={category === "popular" ? "btn-active" : "btn-off"}
              >
                TOP HITS
              </button>
              <button
                onClick={() => {
                  setCategory("artist");
                  setSubValue("");
                }}
                className={category === "artist" ? "btn-active" : "btn-off"}
              >
                ARTIST
              </button>
              <button
                onClick={() => {
                  setCategory("genre");
                  setSubValue("");
                }}
                className={category === "genre" ? "btn-active" : "btn-off"}
              >
                GENRE
              </button>
              <button
                onClick={() => {
                  setCategory("years");
                  setSubValue("");
                }}
                className={category === "years" ? "btn-active" : "btn-off"}
              >
                YEARS
              </button>
            </div>

            {category === "artist" && (
              <input
                type="text"
                placeholder="Wpisz artystę..."
                value={subValue}
                onChange={(e) => setSubValue(e.target.value)}
                className="invite-form-input"
              />
            )}

            {category === "genre" && (
              <select
                value={subValue}
                onChange={(e) => setSubValue(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#111",
                  color: "#fff",
                  border: "1px solid #4ade80",
                  borderRadius: "10px",
                }}
              >
                <option value="">Wybierz gatunek...</option>
                <option value="Rock">Rock</option>
                <option value="Pop">Pop</option>
                <option value="Hip-Hop">Hip-Hop</option>
                <option value="R&B">R&B</option>
                <option value="Electronic">Electronic</option>
                <option value="Jazz">Jazz</option>
              </select>
            )}

            {category === "years" && (
              <select
                value={subValue}
                onChange={(e) => setSubValue(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#111",
                  color: "#fff",
                  border: "1px solid #4ade80",
                  borderRadius: "10px",
                }}
              >
                <option value="">Wybierz lata...</option>
                <option value="1970">Lata 70s</option>
                <option value="1980">Lata 80s</option>
                <option value="1990">Lata 90s</option>
                <option value="2000">Lata 2000s</option>
                <option value="2010">Lata 2010s</option>
                <option value="2020">Lata 2020s</option>
              </select>
            )}

            <button
              onClick={() => fetchTrack()}
              className="menu-button"
              style={{
                background: "#4ade80",
                color: "#000",
                marginTop: "20px",
                width: "100%",
              }}
            >
              START
            </button>
          </div>
        ) : gameState === "playing" ? (
          <div className="game-container">
            <div
              className="progress-container"
              style={{
                display: "flex",
                gap: "2px",
                height: "12px",
                background: "#222",
                marginBottom: "20px",
              }}
            >
              {LEVELS.map((level, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: level,
                    background: idx <= currentAttempt ? "#4ade80" : "#444",
                    borderRight: "1px solid #111",
                  }}
                />
              ))}
            </div>

            <div className="history-list" style={{ marginBottom: "20px" }}>
              {[...Array(LEVELS.length)].map((_, idx) => (
                <div
                  key={idx}
                  className="history-item"
                  style={{
                    height: "35px",
                    border: "1px solid #333",
                    marginBottom: "5px",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 10px",
                    fontSize: "0.8rem",
                    background: attemptsHistory[idx]
                      ? "rgba(255, 71, 87, 0.15)"
                      : "transparent",
                    color: attemptsHistory[idx] ? "#ff4757" : "#555",
                  }}
                >
                  {attemptsHistory[idx] ||
                    (idx === currentAttempt ? "TWOJA PRÓBA..." : "")}
                </div>
              ))}
            </div>

            <button onClick={playPreview} className="play-btn-large">
              {isPlaying ? "..." : "▶"}
            </button>

            <div style={{ position: "relative", marginTop: "20px" }}>
              <input
                type="text"
                placeholder="Znasz tytuł?"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                autoComplete="off"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#111",
                  border: "1px solid #444",
                  color: "#fff",
                }}
                onKeyDown={(e) => e.key === "Enter" && handleGuess()}
              />
              {suggestions.length > 0 && (
                <div className="suggestions-box">
                  {suggestions.map((s: any) => (
                    <div
                      key={s.trackId}
                      className="suggestion-item"
                      onClick={() => handleGuess(s.trackName)}
                    >
                      {s.trackName} - {s.artistName}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={() => handleGuess()}
                className="action-btn-green"
              >
                SUBMIT
              </button>
              <button
                onClick={() => handleGuess("SKIPPED")}
                className="action-btn-gray"
              >
                SKIP
              </button>
            </div>
            <audio ref={audioRef} src={targetTrack.preview} />
          </div>
        ) : (
          <div className="result-container">
            <h2
              style={{ color: feedback === "CORRECT!" ? "#4ade80" : "#ff4757" }}
            >
              {feedback}
            </h2>
            <img
              src={targetTrack.cover}
              style={{
                width: "150px",
                borderRadius: "10px",
                margin: "20px 0",
                boxShadow: "0 0 20px rgba(74,222,128,0.3)",
              }}
            />
            <p style={{ fontSize: "1.3rem" }}>
              <strong>{targetTrack.name}</strong>
            </p>
            <p style={{ color: "#aaa" }}>{targetTrack.artist}</p>
            <button
              onClick={() => fetchTrack()}
              className="menu-button"
              style={{
                background: "#4ade80",
                color: "#000",
                marginTop: "30px",
                width: "100%",
              }}
            >
              GRAJ DALEJ
            </button>
          </div>
        )}

        <div style={{ paddingTop: "20px" }}>
          <MenuButton label="EXIT" to="/" external={false} />
        </div>
      </div>

      <style>{`
        .btn-active { background: #4ade80; color: #000; padding: 10px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        .btn-off { background: #222; color: #fff; padding: 10px; border: 1px solid #444; border-radius: 5px; cursor: pointer; }
        .play-btn-large { width: 70px; height: 70px; border-radius: 50%; background: #4ade80; border: none; font-size: 1.5rem; cursor: pointer; display: block; margin: 0 auto; transition: 0.2s; }
        .play-btn-large:hover { transform: scale(1.1); box-shadow: 0 0 15px #4ade80; }
        .suggestions-box { position: absolute; bottom: 100%; left: 0; right: 0; background: #222; border: 1px solid #444; z-index: 10; max-height: 200px; overflow-y: auto; }
        .suggestion-item { padding: 10px; cursor: pointer; border-bottom: 1px solid #333; font-size: 0.8rem; text-align: left; }
        .suggestion-item:hover { background: #333; color: #4ade80; }
        .action-btn-green { flex: 1; padding: 12px; background: #4ade80; color: #000; border: none; font-weight: bold; cursor: pointer; border-radius: 5px; }
        .action-btn-gray { flex: 1; padding: 12px; background: #333; color: #fff; border: none; cursor: pointer; border-radius: 5px; }
      `}</style>
    </div>
  );
}
