import { useState } from "react";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import "./Ranking.css";

type SearchCategory = "popular" | "artist" | "genre" | "years";

export default function MusicPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<SearchCategory>("popular");

  const search = async () => {
    setLoading(true);
    try {
      let searchTerm = "";

      // Logika budowania zapytania na podstawie kategorii
      if (category === "popular") {
        searchTerm = query ? `${query} top hits` : "top charts hits";
      } else if (category === "artist") {
        searchTerm = query;
      } else if (category === "genre") {
        searchTerm = `${query} hits`;
      } else if (category === "years") {
        searchTerm = `${query} hits`;
      }

      if (!searchTerm) {
        setLoading(false);
        return;
      }

      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          searchTerm
        )}&entity=song&limit=20`
      );
      const data = await res.json();

      const songs = data.results.map((item: any) => ({
        id: item.trackId,
        name: item.trackName,
        artist: item.artistName,
        preview_url: item.previewUrl,
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
      <div
        className="ranking-card"
        style={{ maxWidth: "600px", minHeight: "650px" }}
      >
        <h1 className="neon-text">MUSIC EXPLORER</h1>
        <p className="subtitle">Przeglądaj bazę iTunes - Bez logowania</p>

        {/* Selektor kategorii */}
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
            onClick={() => setCategory("popular")}
            className={category === "popular" ? "btn-active" : "btn-off"}
            style={{
              padding: "10px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            POPULARNE
          </button>
          <button
            onClick={() => setCategory("artist")}
            className={category === "artist" ? "btn-active" : "btn-off"}
            style={{
              padding: "10px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ARTYSTA
          </button>
          <button
            onClick={() => setCategory("genre")}
            className={category === "genre" ? "btn-active" : "btn-off"}
            style={{
              padding: "10px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            GATUNEK
          </button>
          <button
            onClick={() => setCategory("years")}
            className={category === "years" ? "btn-active" : "btn-off"}
            style={{
              padding: "10px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            LATA
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <input
            type="text"
            placeholder={
              category === "artist"
                ? "Wpisz artystę..."
                : category === "genre"
                ? "Wpisz gatunek (np. Rock)..."
                : category === "years"
                ? "Wpisz rok/dekadę (np. 1990)..."
                : "Wyszukaj hity..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
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
          style={{ maxHeight: "350px", overflowY: "auto" }}
        >
          {loading ? (
            <p>Szukanie...</p>
          ) : results.length > 0 ? (
            results.map((track) => (
              <div
                key={track.id}
                className="ranking-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  padding: "10px",
                  background: "rgba(255,255,255,0.05)",
                  marginBottom: "10px",
                  borderRadius: "12px",
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
          ) : (
            <p style={{ color: "#555", marginTop: "20px" }}>
              Wpisz coś i kliknij szukaj...
            </p>
          )}
        </div>

        <div>
          <MenuButton label="BACK" to="/" external={false} />
        </div>
      </div>

      <style>{`
        .btn-active { background: #4ade80; color: #000; border: none; }
        .btn-off { background: #222; color: #fff; border: 1px solid #444; }
      `}</style>
    </div>
  );
}
