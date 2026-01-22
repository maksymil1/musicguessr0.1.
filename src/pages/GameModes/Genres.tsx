import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GENRE_LIST } from "../../types/genres";
import "./Genres.css";

interface GenresProps {
  onGenreSelect?: (playlistUrn: string, label: string) => void;
}

const Genres = ({ onGenreSelect }: GenresProps) => {
  const [inputValue, setInputValue] = useState("");
  const navigate = useNavigate();

  const visibleGenres = GENRE_LIST.filter((genre) => {
    if (!inputValue) return true;
    return genre.label.toLowerCase().includes(inputValue.toLowerCase());
  }).sort((a, b) => a.label.localeCompare(b.label));

  const handleSelect = (genre: (typeof GENRE_LIST)[0]) => {
    if (onGenreSelect) {
      // Multiplayer
      onGenreSelect(genre.playlistUrn, genre.label);
    } else {
      // Single Player (if restored in the future)
      navigate(`/play/${genre.slug}`, {
        state: { playlistUrn: genre.playlistUrn, urn: genre.urn },
      });
    }
  };

  return (
    <div className="genre-container">
      <h3 className="genre-header">SELECT GENRE</h3>

      <div className="genre-sidebar">
        <input
          className="genre-search-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search genre..."
          autoFocus // Automatically focus input on mount
        />

        <ul className="genre-list">
          {visibleGenres.length > 0 ? (
            visibleGenres.map((genre) => (
              <li key={genre.urn}>
                {onGenreSelect ? (
                  <button
                    onClick={() => handleSelect(genre)}
                    className="genre-link"
                  >
                    {genre.label}
                  </button>
                ) : (
                  <NavLink
                    to={`/play/${genre.slug}`}
                    className={({ isActive }) =>
                      isActive ? "genre-link active" : "genre-link"
                    }
                    state={{ playlistUrn: genre.playlistUrn, urn: genre.urn }}
                  >
                    {genre.label}
                  </NavLink>
                )}
              </li>
            ))
          ) : (
            <li style={{ padding: "20px", textAlign: "center", color: "#666" }}>
              No genre found for "{inputValue}"
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Genres;