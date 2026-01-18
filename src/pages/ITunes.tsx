import { useState } from "react";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import "./Ranking.css";

export default function MusicPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query) return;
    setLoading(true);
    try {
      // Korzystamy z API iTunes - nie wymaga tokenów ani serwera auth!
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          query
        )}&entity=song&limit=10`
      );
      const data = await res.json();

      // Mapujemy dane na format podobny do Twojego poprzedniego
      const songs = data.results.map((item: any) => ({
        id: item.trackId,
        name: item.trackName,
        artist: item.artistName,
        preview_url: item.previewUrl, // iTunes zawsze daje previewUrl!
        albumArt: item.artworkUrl100,
      }));

      setResults(songs);
    } catch (e) {
      console.error("Błąd wyszukiwania:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ranking-master">
      <div className="ranking-card" style={{ maxWidth: "600px" }}>
        <h1 className="neon-text">MUSIC EXPLORER</h1>
        <p className="subtitle">Próbki z iTunes - Działają bez logowania</p>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Wpisz wykonawcę lub tytuł..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              background: "#000",
              color: "#fff",
              border: "1px solid #4ade80",
            }}
          />
          <button
            onClick={search}
            style={{
              background: "#4ade80",
              color: "black",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            SZUKAJ
          </button>
        </div>

        <div
          className="ranking-list"
          style={{ maxHeight: "400px", overflowY: "auto" }}
        >
          {loading ? (
            <p>Szukanie...</p>
          ) : (
            results.map((track) => (
              <div
                key={track.id}
                className="ranking-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  padding: "10px",
                }}
              >
                <img
                  src={track.albumArt}
                  alt="Cover"
                  style={{ width: "50px", borderRadius: "5px" }}
                />
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div
                    style={{
                      color: "#4ade80",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                    }}
                  >
                    {track.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#888" }}>
                    {track.artist}
                  </div>
                  <audio
                    controls
                    src={track.preview_url}
                    style={{ width: "100%", height: "30px", marginTop: "8px" }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="nav-footer">
          <MenuButton label="POWROT" to="/" external={false} />
        </div>
      </div>
    </div>
  );
}