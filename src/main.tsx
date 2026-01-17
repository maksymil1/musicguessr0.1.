import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import App from "./App.tsx";
import Home from "./pages/Home.tsx";
import PlayMenu from "./pages/PlayMenu.tsx";
import Lobby from "./pages/Lobby.tsx";
import MultiplayerGame from "./pages/MultiplayerGame.tsx";
import Tryb from "./pages/GameModes/Tryb.tsx";
import Solo from "./pages/Solo.tsx";
import MusicPage from "./pages/ITunes.tsx";

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
        path: "tryb",
        element: <Tryb />,
      },
      // --- ŚCIEŻKI MULTIPLAYER ---
      {
        path: "tryb/multiplayer", // Menu wyboru nicku/tworzenia
        element: <PlayMenu />,
      },
      {
        path: "lobby/:roomId", // Poczekalnia
        element: <Lobby />,
      },
      {
        path: "game/:roomId", // Główny kontener gry
        element: <MultiplayerGame />,
      },
      // --- ŚCIEŻKI SINGLEPLAYER ---
      {
        path: "tryb/singleplayer",
        element: <Solo />,
      },
      {
        path: "search",
        element: <MusicPage />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
