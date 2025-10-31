import QuizPlayer from "./components/QuizPlayer";
import "./App.css";

function App() {
  //let opcje = ["Graj", "Zaloguj sie", "Zarejestruj sie"];

  return (
    <div>
      {/* <FirstPage opcje={opcje} onClick={() => console.log(opcje)} /> */}
      {/* <Test />*/}
      <QuizPlayer />
    </div>
  );
}

export default App;
