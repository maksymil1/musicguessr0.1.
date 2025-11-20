import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {SoundCloudTrack} from '../types'; // Import typów

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults ] = useState<SoundCloudTrack | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Błąd wyszukiwania');
      
      const data: SoundCloudTrack = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      alert('Wystąpił błąd podczas szukania.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackSelect = (track: SoundCloudTrack) => {
    navigate(`/play/${track.id}`);
  };

  return (
    <div className="p-4">
      <h1>Wyszukiwarka Utworów</h1>
      
      <form onSubmit={handleSearch} className="mb-4">
        <input
          type="text"
          placeholder="Wpisz nazwę utworu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border p-2 mr-2"
        />
        <button type="submit" disabled={isLoading}>
          {isLoading? 'Szukanie...' : 'Szukaj'}
        </button>
      </form>

      <div className="results-list">
        {results?.map((track) => (
          <div 
            key={track.id} 
            onClick={() => handleTrackSelect(track.id)}
            className="border p-2 mb-2 cursor-pointer hover:bg-gray-100 flex items-center gap-4"
            style={{ cursor: 'pointer', border: '1px solid #ccc', margin: '10px 0' }}
          >
            {track.artwork_url && (
              <img src={track.artwork_url} alt={track.title} width={50} height={50} />
            )}
            <div>
              <div className="font-bold">{track.title}</div>
              <div className="text-sm text-gray-600">{track.user.username}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchPage;