import { NavLink } from "react-router-dom";
import { GENRE_LIST } from "../../types/genres.ts";
import "./Genres.css";
import { useState } from "react";

const Genres = () => {
  const [inputValue, setInputValue] = useState("");

  const visibleGenres = GENRE_LIST.filter((genre) => {
    if (!inputValue) return true; // Jeśli input pusty, pokaż wszystko
    return genre.label.toLowerCase().includes(inputValue.toLowerCase());
  }).sort((a, b) => {
    return a.label.localeCompare(b.label); //localeCompare - porównuje dwa stringi, obsługuje polskie znaki
  });

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
                <NavLink
                  to={`/play/${genre.slug}`}
                  className={({ isActive }) =>
                    isActive ? "genre-link active" : "genre-link"
                  }
                  state={{ playlistUrn: genre.playlistUrn, urn: genre.urn }}
                >
                  {genre.label}
                </NavLink>
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
