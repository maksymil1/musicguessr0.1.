import { NavLink, useParams, useNavigate } from "react-router-dom";
import { GENRE_LIST } from "../../types/genres.ts";
import { supabase } from "../../../lib/supabaseClient";
import "./Genres.css";
import { useState } from "react";

const Genres = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");

  const visibleGenres = GENRE_LIST.filter((genre) => {
    if (!inputValue) return true;
    return genre.label.toLowerCase().includes(inputValue.toLowerCase());
  }).sort((a, b) => a.label.localeCompare(b.label));

  // FUNKCJA STARTUJĄCA GRĘ DLA WSZYSTKICH
  const handleSelectGenre = async (genre: any) => {
    if (!roomId) return;

    // 1. Aktualizujemy status pokoju i przypisujemy wybrany gatunek/playlistę
    const { error } = await supabase
      .from("Room")
      .update({ 
        status: "PLAYING", 
        playlistUrn: genre.playlistUrn, // Zapisujemy piosenki z tego gatunku
        currentGenreLabel: genre.label  // Opcjonalnie do wyświetlania nazwy w grze
      })
      .eq("id", roomId);

    if (error) {
      console.error("Błąd startowania gry:", error.message);
      return;
    }

    // 2. Host przechodzi do gry (Goście zostaną przekierowani przez Realtime w Lobby)
    navigate(`/game/${roomId}`);
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
                {/* Zmieniliśmy NavLink na div z onClick, aby wykonać logikę bazy danych przed zmianą strony */}
                <div
                  onClick={() => handleSelectGenre(genre)}
                  className="genre-link"
                  style={{ cursor: "pointer" }}
                >
                  {genre.label}
                </div>
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