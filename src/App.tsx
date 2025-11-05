import { useState } from "react";
import QuizPlayer from "./components/QuizPlayer";
import Home from "./pages/home";
import "./App.css";

function App() {
  const [currentScreen, setCurrentScreen] = useState<"home" | "play" | "friends" | "stats">("home");

  return (
    <>
      {currentScreen === "home" && <Home onNavigate={setCurrentScreen} />}
      {currentScreen === "play" && <QuizPlayer />}
      {currentScreen === "friends" && <div>Friends screen</div>}
      {currentScreen === "stats" && <div>Stats screen</div>}
    </>
  );
}

export default App;
