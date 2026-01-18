import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

// IMPORT KONTEKSTÓW
import { AuthProvider } from "./context/AuthContext.tsx";
import { VolumeProvider } from "./context/VolumeContext.tsx"; // Nowy kontekst głośności

// IMPORTY KOMPONENTÓW I STRON
import App from "./App.tsx";
import Home from "./pages/Home.tsx";
import PlayMenu from "./pages/PlayMenu.tsx";
import Lobby from "./pages/Lobby.tsx";
import MultiplayerGame from "./pages/MultiplayerGame.tsx";
import Tryb from "./pages/GameModes/Tryb.tsx";
import Solo from "./pages/Solo.tsx";
import MusicPage from "./pages/ITunes.tsx"; // Twój EXPLORE
import Ranking from "./pages/Ranking.tsx";
import Friends from "./pages/Friends.tsx";
import Login from "./pages/Login.tsx";

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
        path: "login",
        element: <Login />,
      },
      {
        path: "ranking",
        element: <Ranking />,
      },
      {
        path: "friends",
        element: <Friends />,
      },
      {
        path: "tryb",
        element: <Tryb />,
      },
      // --- ŚCIEŻKI MULTIPLAYER ---
      {
        path: "tryb/multiplayer",
        element: <PlayMenu />,
      },
      {
        path: "lobby/:roomId",
        element: <Lobby />,
      },
      {
        path: "game/:roomId",
        element: <MultiplayerGame />,
      },
      // --- ŚCIEŻKI SINGLEPLAYER ---
      {
        path: "tryb/singleplayer",
        element: <Solo />,
      },
      // --- EXPLORE / SEARCH ---
      {
        path: "search",
        element: <MusicPage />,
      },
    ],
  },
]);

// RENDEROWANIE APLIKACJI
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      {/* VolumeProvider owija RouterProvider, aby suwak głośności działał wszędzie */}
      <VolumeProvider>
        <RouterProvider router={router} />
      </VolumeProvider>
    </AuthProvider>
  </StrictMode>
);