import axios from 'axios';
import  {getAccessToken} from '../soundCloud/soundCloudAuth.js'; 
import { GENRE_LIST } from '../../src/types/genres.ts';

const CLIENT_ID = "dH1Xed1fpITYonugor6sw39jvdq58M3h";

async function findBestPlaylistForGenre(genre) {
    const accessToken = await getAccessToken();
    const headers = { 'Authorization': `OAuth ${accessToken}` };

  try {
    const res = await axios.get(`https://api.soundcloud.com/playlists`, {
        headers,
      params: {
        q: genre.label,
        limit: 50,
        show_tracks: true,
        linked_partitioning: true,
      }
    });
    
    let mostLiked = null;
    for (const playlist of res.data.collection) {
        if (playlist.track_count > 0) {
            if (!mostLiked || playlist.likes_count > mostLiked.likes_count) {
              mostLiked = playlist;
            }
        }
    }
    if (mostLiked) {
      console.log(`\nZNALAZŁEM dla ${genre.label}:`);
      console.log(`Tytuł: "${mostLiked.title}"`);
      console.log(`Lajki: ${mostLiked.likes_count}`);
      console.log(`ID: ${mostLiked.id}`);
      console.log(`URN: ${mostLiked.urn}`); 
    } else {
      console.log(`Nie znaleziono sensownej playlisty dla ${genre.label}`);
    }
  } catch (error) {
    console.error(`Błąd dla ${genre.label}:`, error.message);
  }
}


(async () => {
  for (const genre of GENRE_LIST) {
    await findBestPlaylistForGenre(genre);
  }
  // await findBestPlaylistForGenre(GENRE_LIST[1]);
})();