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
        // 👇 TO ZOSTAŁO NAPRAWIONE (dodano :roomId)
        path: "game/:roomId", 
        element: <QuizPage />,
      },
      {
        path: "friends",
        element: <Test />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);