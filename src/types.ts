

export interface SoundCloudUser {
  username: string;
  avatar_url: string;
}

export interface SoundCloudTrack {
  id: number;           // Numeryczne ID (wciąż główne)
  urn: string;          // Nowy format identyfikatora (np. "soundcloud:tracks:12345")
  title: string;
  user: SoundCloudUser;
  artwork_url: string | null;
  duration: number;     // czas w ms
  permalink_url: string;
  streamable: boolean;  
}

export interface SearchResponse {
  collection: SoundCloudTrack;
  next_href?: string;
  total_results?: number;
}