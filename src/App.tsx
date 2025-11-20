import { Outlet } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      {/* Ten nagłówek będzie widoczny na każdej stronie */}
      {/* <header>
        <h1>Moja Aplikacja Muzyczna</h1>
      </header> */}

      <main>
        {/* === TUTAJ ZOSTANIE WYRENDEROWANE DZIECKO === */}
        {/* (Menu lub PlayerPage, w zależności od URL) */}
        <Outlet />
      </main>

      {/* Ta stopka również będzie widoczna na każdej stronie */}
      {/* <footer>&copy; 2024. Wszelkie prawa zastrzeżone.</footer> */}
    </div>
  );
}

export default App;
