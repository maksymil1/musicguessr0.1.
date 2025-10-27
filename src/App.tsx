//import ListGroup from "./components/ListGroup";
import { FirstPage } from "./components/FirstPage";
import "./App.css";

function App() {
  let opcje = ["Graj", "Zaloguj sie", "Zarejestruj sie"];

  return (
    <div>
      <FirstPage opcje={opcje} onClick={() => console.log(opcje)} />
    </div>
  );
}

export default App;
