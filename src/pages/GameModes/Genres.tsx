// src/pages/GameModes/Genres.tsx
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GENRE_LIST } from "../../types/genres";
import "./Genres.css";

interface GenresProps {
  onGenreSelect?: (playlistUrn: string, label: string) => void; // Nowy props dla Multi
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
      // Multiplayer: Zwracamy URN playlisty do rodzica
      onGenreSelect(genre.playlistUrn, genre.label);
    } else {
      // Single Player: Nawigacja
      navigate(`/play/${genre.slug}`, {
        state: { playlistUrn: genre.playlistUrn, urn: genre.urn },
      });
    }
  };

  return (
    <div className="genre-container">
      <h3 className="genre-header">Gatunki</h3>
      <nav className="genre-sidebar">
        <input
          className="border p-3 rounded text-black w-full shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={"Wyszukaj gatunek..."}
        />
        <ul className="genre-list">
          {visibleGenres.length > 0 ? (
            visibleGenres.map((genre) => (
              <li key={genre.urn}>
                {/* Jeśli onGenreSelect istnieje, używamy div/button zamiast NavLink */}
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
            <li className="p-3 text-gray-500 text-sm">
              Nie znaleziono gatunku
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
};

export default Genres;
