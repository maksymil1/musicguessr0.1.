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

// import { useState } from "react";
// import { Outlet } from 'react-router-dom';
// import QuizPage from "./pages/QuizPage.tsx";
// import Home from "./pages/home";
// import "./App.css";

// function App() {
//   const [currentScreen, setCurrentScreen] = useState<
//     "home" | "play" | "friends" | "stats"
//   >("home");

//   return (
//     <>
//       {currentScreen === "home" && <Home onNavigate={setCurrentScreen} />}
//       {currentScreen === "play" && <QuizPage />}
//       {currentScreen === "friends" && <div>Friends screen</div>}
//       {currentScreen === "stats" && <div>Stats screen</div>}
//     </>
//   );
// }

// export default App;
