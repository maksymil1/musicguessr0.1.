import { Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import "./App.css";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="app-container d-flex justify-content-center align-items-center">
        <div className="spinner-border text-light" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* USUNIĘTO NAVBAR: 
          Pasek użytkownika jest teraz renderowany bezpośrednio w Home.tsx, 
          dzięki czemu nie dubluje się i wygląda lepiej.
      */}

      <main className="content-wrapper">
        <Outlet />
      </main>

      {/* UWAGA: Jeśli masz głośniki w Home.tsx, możesz rozważyć 
          usunięcie ich stąd, żeby nie nakładały się na siebie. 
      */}
      <div className="speakers-container">
        <div className="speaker left-speaker"></div>
        <div className="speaker right-speaker"></div>
      </div>
    </div>
  );
}

export default App;