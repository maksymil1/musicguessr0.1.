import { Outlet } from "react-router-dom";

import { useAuth } from "./context/AuthContext"; // Zakładam, że masz ten kontekst

import "./App.css";

function App() {
  const { user, signOut, loading } = useAuth(); // Odkomentuj jeśli używasz

  // const user = { email: "test@test.pl" }; // MOCK DO TESTÓW (usuń to jak masz działający AuthContext)

  // const loading = false;

  // const signOut = () => console.log("Log out");

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
      {/* Navbar - zmieniony na przezroczysty, żeby pasował do tła */}

      {user && (
        <nav
          className="navbar navbar-dark bg-transparent px-4 py-3 w-100"
          style={{ zIndex: 10 }}
        >
          <span
            className="navbar-brand mb-0 h1 fw-bold fs-3 text-white"
            style={{ fontFamily: "Comic Sans MS, cursive" }}
          >
            MusicGuessr
          </span>

          <div className="d-flex align-items-center gap-3">
            <span
              className="text-white d-none d-md-inline fw-bold"
              style={{ textShadow: "1px 1px 2px black" }}
            >
              {user.email}
            </span>

            <button
              className="main-button"
              onClick={signOut}
              style={{
                padding: "5px 15px",

                fontSize: "1rem",

                border: "2px solid white",

                color: "black",

                background: "white",
              }}
            >
              Wyloguj
            </button>
          </div>
        </nav>
      )}

      {/* Zmieniono 'container' na 'content-wrapper', żeby nie ściskało po bokach */}

      <main className="content-wrapper">
        <Outlet />
      </main>

      {/* Dekoracje tła - głośniki (widoczne zawsze) */}

      <div className="speakers-container">
        <div className="speaker left-speaker"></div>

        <div className="speaker right-speaker"></div>
      </div>
    </div>
  );
}

export default App;
