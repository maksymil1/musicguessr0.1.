import { Routes, Route } from "react-router-dom";
import Home from "./pages/home"; // <-- twój nowy ekran startowy
import QuizPlayer from "./components/QuizPlayer";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play" element={<QuizPlayer />} />
      <Route path="/friends" element={<div>Friends screen</div>} />
      <Route path="/stats" element={<div>Stats screen</div>} />
    </Routes>
  );
}

export default App;
