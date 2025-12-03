export type GameMode = "playlist" | "genre" | "artist";

export interface GameTrack {
  id: number;         
  urn?: string;        
  title: string;
  artist: string;       
  artworkUrl: string | null; 
  streamUrl?: string;   
  permalinkUrl: string; 
  duration: number;    
}

// Typ pomocniczy dla odpowiedzi z API SoundCloud
export interface SoundCloudTrackResponse {
  id: number;
  urn?: string;
  title: string;
  user: {
    username: string;
    avatar_url: string;
  };
  artwork_url?: string;
  permalink_url: string;
  duration: number;
  streamable: boolean;
  access?: 'playable' | 'preview' | 'blocked';
  playback_count?: number;
}