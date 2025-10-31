import { useState } from "react";
import AudioToggle from "./AudioToggle";

const CLIENT_ID = import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID;

export default function QuizPlayer() {
  const [trackId, setTrackId] = useState<number | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string>("");

  const searchAndPickTrack = async (keyword: string) => {
    const res = await fetch(
      `https://api.soundcloud.com/playlists?q=${encodeURIComponent(
        keyword
      )}&client_id=${CLIENT_ID}`
    );
    const playlists = await res.json();
    if (playlists.length === 0) return;

    const playlist = playlists[0];
    setPlaylistTitle(playlist.title);

    const tracks = playlist.tracks;
    const random = tracks[Math.floor(Math.random() * tracks.length)];
    setTrackId(random.id); // 🎯 tu ustawiamy ID
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
          trackId={trackId} // 🎧 tu przekazujemy do komponentu
          autoStopSeconds={5}
        />
      )}
    </div>
  );
}
