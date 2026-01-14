import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import App from "./App.tsx";
import Home from "./pages/Home.tsx";
import Test from "./components/Test.tsx";
import QuizPage from "./pages/QuizPage.tsx";
import PlayMenu from "./pages/PlayMenu.tsx";
import Lobby from "./pages/Lobby.tsx";
import GameModes from "./pages/GameModes/GameModes.tsx"; 
import Genres from "./pages/GameModes/Genres.tsx";
import Ranking from "./pages/Ranking.tsx";
import Friends from "./pages/Friends.tsx";

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
        path: "play",
        element: <PlayMenu />,
      },
      {
        path: "lobby/:roomId",
        element: <Lobby />,
      },
      {
        path: "modes/:roomId", // Trasa wyboru trybu
        element: <GameModes />,
      },
      {
        path: "genres/:roomId", // Trasa wyboru gatunku
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);