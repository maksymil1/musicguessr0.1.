import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import App from "./App.tsx";
import Home from "./pages/Home.tsx";
import Test from "./components/Test.tsx";
import QuizPage from "./pages/QuizPage.tsx";
import AuthForm from "./components/AuthForm.tsx"; // Twój formularz
import { AuthProvider } from "./context/AuthContext.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // App jest głównym layoutem
    children: [
      {
        index: true,
        element: <Home />, // Home jest publiczny! Każdy może wejść
      },
      {
        path: "login",
        element: <AuthForm />, // Logowanie jest dostępne pod /login
      },
      // --- TRASY CHRONIONE ---
      {
        element: <ProtectedRoute />, // Wszystko poniżej wymaga logowania
        children: [
          {
            path: "play",
            element: <QuizPage />,
          },
          {
            path: "friends",
            element: <Test />,
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
