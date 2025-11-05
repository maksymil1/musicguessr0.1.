import { Routes, Route } from "react-router-dom";
import Home from "./pages/home"; // <-- twój nowy ekran startowy
import QuizPlayer from "./components/QuizPlayer";
import "./App.css";

function App() {
  return (
        <div>
      {/* <FirstPage opcje={opcje} onClick={() => console.log(opcje)} /> */}
      {/* <Test />*/}
      <QuizPlayer />
    </div>
  );
}

export default App;
