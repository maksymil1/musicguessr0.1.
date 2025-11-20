import React, { useState, useEffect } from "react";
import HlsPlayer from "./HlsPlayer.tsx";
import { useParams, useNavigate } from 'react-router-dom';


const QuizPlayer: React.FC = () => {

  // 1. Pobieramy parametr z URL zdefiniowany w routerze jako :trackID
  const { trackID } = useParams<{ trackID: string }>();
  const navigate = useNavigate();

  const [streamUrl, setStreamUrl ]= useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- TypeScript: Typowanie stanów (useState) ---



useEffect(() => {

    if (!trackID) return;

    const fetchStream = async () => {
      try {
        setError(null);
        // Wywołujemy proxy z dynamicznym ID
        const response = await fetch(`/api/stream/${trackID}`);
        
        if (!response.ok) {
          throw new Error(`Błąd API: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.streamUrl) {
          setStreamUrl(data.streamUrl);
        } else {
          throw new Error("Brak linku streamowania.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      }
    };

    fetchStream();
  },);



  return (
    <div>
      <button onClick={() => navigate(-1)}> &larr; Wróć do wyszukiwania</button>
      <h2>Testowy Odtwarzacz</h2>
      <p>Odtwarzanie utworu ID: {trackID}</p>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      {/* Renderuj odtwarzacz HLS tylko jeśli mamy streamUrl */}
      {streamUrl? (
        <HlsPlayer src={streamUrl} />
      ) : (
       !error && <p>Ładowanie strumienia...</p>
      )}
    </div>
  );
};

export default QuizPlayer;



























// import React, { useState } from "react";
// import HlsPlayer from "./HlsPlayer.tsx";


// // Stała ID utworu do testów
// const TEST_TRACK_ID = "90787841";

// // --- TypeScript: Definicja oczekiwanej odpowiedzi z naszego API proxy ---
// interface StreamApiResponse {
//   streamUrl: string;
//   // Możemy też zdefiniować potencjalny błąd, jeśli API tak zwraca
//   error?: string;
// }

// const QuizPlayer: React.FC = () => {
//   // --- TypeScript: Typowanie stanów (useState) ---
//   const [streamUrl, setStreamUrl] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);

//   // Funkcja wywoływana po kliknięciu przycisku
//   const handlePlayTestTrack = async () => {
//     setIsLoading(true);
//     setError(null);
//     setStreamUrl(null);

//     try {
//       // Wywołaj WŁASNE API proxy
//       const response = await fetch(`/api/stream/${TEST_TRACK_ID}`);

//       if (!response.ok) {
//         const errorData: Partial<StreamApiResponse> = await response.json();
//         throw new Error(errorData.error || `Błąd serwera: ${response.status}`);
//       }

//       const data: StreamApiResponse = await response.json();

//       if (data.streamUrl) {
//         setStreamUrl(data.streamUrl);
//       } else {
//         throw new Error("API nie zwróciło streamUrl.");
//       }
//     } catch (err) {
//       // --- TypeScript: Poprawna obsługa błędów w bloku catch ---
//       // 'err' jest domyślnie typu 'unknown', więc sprawdzamy, czy jest instancją Error
//       if (err instanceof Error) {
//         console.error("Nie udało się pobrać strumienia:", err.message);
//         setError(err.message);
//       } else {
//         console.error("Nieznany błąd:", err);
//         setError("Wystąpił nieoczekiwany błąd.");
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div>
//       <h2>Testowy Odtwarzacz Quizu (TSX)</h2>
//       <p>Testowanie utworu o ID: {TEST_TRACK_ID}</p>

//       <button onClick={handlePlayTestTrack} disabled={isLoading}>
//         {isLoading ? "Ładowanie strumienia..." : "Odtwórz utwór testowy"}
//       </button>

//       {/* Wyświetl komunikaty o stanie */}
//       {error && (
//         <div style={{ color: "red", marginTop: "10px" }}>
//           <strong>Błąd:</strong> {error}
//         </div>
//       )}

//       {/* Renderuj odtwarzacz HLS tylko jeśli mamy streamUrl */}
//       {streamUrl && (
//         <div style={{ marginTop: "20px" }}>
//           <HlsPlayer src={streamUrl} />
//         </div>
//       )}
//     </div>
//   );
// };

// export default QuizPlayer;
