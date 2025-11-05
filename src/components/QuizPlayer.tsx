import { useState } from "react";
import AudioToggle from "./AudioToggle";

export default function QuizPlayer() {
  const [trackId, setTrackId] = useState<string | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string>("");

  const extractId = (item: any): string | null => {
    if (!item) return null;
    if (typeof item.id !== "undefined") return String(item.id);
    if (typeof item.track_id !== "undefined") return String(item.track_id);
    if (item.track && typeof item.track.id !== "undefined")
      return String(item.track.id);
    if (item.id_str) return String(item.id_str);
    return null;
  };

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

      // normalize possible shapes from SoundCloud proxy
      const collections: any[] =
        Array.isArray(data.collection) && data.collection.length
          ? data.collection
          : Array.isArray(data)
          ? (data as any)
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.collection?.items)
          ? data.collection.items
          : [];

      if (collections.length === 0) {
        alert("Nie znaleziono playlist.");
        return;
      }

      const playlist = collections[0];
      setPlaylistTitle(playlist.title ?? playlist.name ?? "Brak tytułu");

      const tracks: any[] =
        Array.isArray(playlist.tracks) && playlist.tracks.length
          ? playlist.tracks
          : Array.isArray(playlist.items) && playlist.items.length
          ? playlist.items
          : Array.isArray(playlist.tracks?.collection) &&
            playlist.tracks.collection.length
          ? playlist.tracks.collection
          : [];

      if (tracks.length === 0) {
        alert("Playlista nie zawiera utworów. Sprawdź konsolę.");
        console.log("playlist without tracks:", playlist);
        return;
      }

      const randomItem = tracks[Math.floor(Math.random() * tracks.length)];
      const id = extractId(randomItem);
      if (!id) {
        alert("Wybrany utwór nie ma rozpoznawalnego id. Sprawdź konsolę.");
        console.log("bad track item:", randomItem);
        return;
      }

      setTrackId(id);
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

      {trackId != null && (
        <AudioToggle
          title="Odtwórz losowy utwór"
          trackId={trackId}
          autoStopSeconds={5}
        />
      )}
    </div>
  );
}
