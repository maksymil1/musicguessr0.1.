import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.ts";
import type { Session } from "@supabase/supabase-js";
import AuthForm from "./components/AuthForm"; // Teraz ten plik już istnieje
import "./App.css"; // Ten plik też istnieje

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Sprawdź sesję przy starcie
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Nasłuchuj zmian (np. wylogowanie)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- WIDOKI ---

  // 1. Ładowanie (zanim sprawdzimy czy użytkownik jest zalogowany)
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // 2. BRAK SESJI -> Pokaż formularz logowania (nie wpuszczaj do Outletu)
  if (!session) {
    return <AuthForm />;
  }

  // 3. JEST SESJA -> Pokaż aplikację (Menu + Outlet)
  return (
    <div className="app-container">
      {/* Pasek nawigacyjny */}
      <nav className="navbar navbar-light bg-white border-bottom px-4 mb-4">
        <span className="navbar-brand mb-0 h1 fw-bold">MusicGuessr</span>
        <div className="d-flex align-items-center gap-3">
          <small className="text-muted d-none d-md-inline">
            {session.user.email}
          </small>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={handleLogout}
          >
            Wyloguj
          </button>
        </div>
      </nav>

      {/* Tutaj ładują się Twoje podstrony (Home, Play, Test) */}
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
