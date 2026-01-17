import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

// IMPORT KONTEKSTU (To naprawia biały ekran)
import { AuthProvider } from "./context/AuthContext.tsx";

// IMPORTY KOMPONENTÓW I STRON
import App from "./App.tsx";
import Home from "./pages/Home.tsx";
import QuizPage from "./pages/QuizPage.tsx";
import PlayMenu from "./pages/PlayMenu.tsx";
import Lobby from "./pages/Lobby.tsx";
import GameModes from "./pages/GameModes/GameModes.tsx"; 
import Genres from "./pages/GameModes/Genres.tsx";
import Ranking from "./pages/Ranking.tsx";
import Friends from "./pages/Friends.tsx";
import Login from "./pages/Login.tsx"; // Upewnij się, że masz ten plik

// KONFIGURACJA ROUTERA
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "login", // Nowa trasa do logowania
        element: <Login />,
      },
      {
        path: "play",
        element: <PlayMenu />,
      },
      {
        path: "lobby/:roomId",
        element: <Lobby />,
      },
      {
        path: "modes/:roomId",
        element: <GameModes />,
      },
      {
        path: "genres/:roomId",
        element: <Genres />,
      },
      {
        path: "game/:roomId", 
        element: <QuizPage />,
      },
      {
        path: "friends",
        element: <Friends />,
      },
      {
        path: "ranking",
        element: <Ranking />,
      },
    ],
  },
]);

// RENDEROWANIE APLIKACJI
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* AuthProvider musi otaczać RouterProvider, 
        aby każda strona miała dostęp do danych o użytkowniku */}
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);