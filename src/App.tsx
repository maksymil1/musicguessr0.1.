import { Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import "./App.css";

function App() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    // Opcjonalnie spinner, ale zazwyczaj chcemy od razu pokazać App
    return <div className="text-center mt-5">Ładowanie...</div>;
  }

  return (
    <div className="app-container">
      {/* Navbar pokazujemy tylko zalogowanym, lub zmieniamy jego treść */}
      {user && (
        <nav className="navbar navbar-light bg-white border-bottom px-4 mb-4">
          <span className="navbar-brand mb-0 h1 fw-bold">MusicGuessr</span>
          <div className="d-flex align-items-center gap-3">
            <small className="text-muted d-none d-md-inline">
              {user.email}
            </small>
            <button className="btn btn-outline-danger btn-sm" onClick={signOut}>
              Wyloguj
            </button>
          </div>
        </nav>
      )}

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
