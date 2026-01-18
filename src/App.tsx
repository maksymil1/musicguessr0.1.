import { Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useState } from "react"; // Potrzebne do obsługi menu ustawień
import Settings from "./components/Settings"; // Importujemy nowy komponent
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
      {/* GLOBALNE USTAWIENIA - widoczne na każdej podstronie */}
      <Settings />

      <main className="content-wrapper">
        {/* Tu wyświetlają się strony: Home, Solo, Multiplayer itd. */}
        <Outlet />
      </main>

      {/* Głośniki usunięte stąd, ponieważ dodałeś je bezpośrednio do Home.tsx. 
          Dzięki temu nie będą zasłaniać interfejsu w trakcie samej gry. 
      */}
    </div>
  );
}

export default App;