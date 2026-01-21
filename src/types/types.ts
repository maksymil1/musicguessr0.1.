export type GameMode = "playlist" | "genre" | "artist";

export interface GameTrack {   
  // id: number;   
  urn: string;        
  title: string;
  artist: string;       
  artworkUrl: string | null; 
  streamUrl?: string;   
  permalinkUrl: string; 
  duration: number;   
  source?: "itunes" | "soundcloud";
}

// Typ pomocniczy dla odpowiedzi z API SoundCloud
export interface SoundCloudTrackResponse {
  id: number;
  urn?: string; // Czasami API v2 zwraca to w polu top-level
  title: string;
  duration: number;
  streamable: boolean;
  permalink_url: string;
  artwork_url: string | null;
  user: {
    username: string;
    id: number;
    avatar_url: string | null;
  };
  
  // Pola krytyczne dla filtrowania (dostępność):
  access: 'playable' | 'preview' | 'blocked';
  policy: 'ALLOW' | 'MONETIZE' | 'SNIP' | 'BLOCK';
  
  // Popularność (do sortowania artystów)
  playback_count?: number;

  // Informacje o transkodowaniu (czy istnieje plik audio)
  media?: {
    transcodings?: Array<{
      url: string;
      preset: string;
      format: {
        protocol: string;
        mime_type: string;
      };
    }>;
  };
}