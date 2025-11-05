import { useState } from "react";
import AudioToggle from "./AudioToggle";

// removed client-side CLIENT_ID

export default function QuizPlayer() {
  const [trackId, setTrackId] = useState<number | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string>("");

  const searchAndPickTrack = async (keyword: string) => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
      if (!res.ok) {
        console.error("Proxy error:", await res.text());
        alert("Błąd wyszukiwania (proxy). Sprawdź logi serwera.");
        return;
      }

      const data = await res.json();
      console.log("search result:", data);

      const collections = Array.isArray(data.collection)
        ? data.collection
        : Array.isArray(data)
        ? (data as any)
        : [];

      if (collections.length === 0) {
        alert("Nie znaleziono playlist.");
        return;
      }

      const playlist = collections[0]; // lub losowa: collections[Math.floor(Math.random()*collections.length)]
      setPlaylistTitle(playlist.title ?? "Brak tytułu");

      // track list może być w playlist.tracks lub playlist.items zależnie od odpowiedzi
      const tracks: any[] =
        Array.isArray(playlist.tracks) && playlist.tracks.length
          ? playlist.tracks
          : Array.isArray((playlist as any).items) &&
            (playlist as any).items.length
          ? (playlist as any).items
          : [];

      if (tracks.length === 0) {
        alert("Playlista nie zawiera utworów (brak tracks). Sprawdź konsolę.");
        console.log("playlist without tracks:", playlist);
        return;
      }

      const random = tracks[Math.floor(Math.random() * tracks.length)];
      if (!random || typeof random.id === "undefined") {
        alert("Wybrany utwór nie ma id. Sprawdź konsolę.");
        console.log("bad track item:", random);
        return;
      }

      setTrackId(Number(random.id));
    } catch (err) {
      console.error("Network/error:", err);
      alert("Błąd sieciowy podczas wyszukiwania playlist.");
    }
  };

  return (
    <div>
      <button onClick={() => searchAndPickTrack("lofi")}>
        Wyszukaj playlistę "lofi"
      </button>

      {playlistTitle && <div>Playlista: {playlistTitle}</div>}

      {trackId && (
        <AudioToggle
          title="Odtwórz losowy utwór"
          trackId={trackId}
          autoStopSeconds={5}
        />
      )}
    </div>
  );
}
