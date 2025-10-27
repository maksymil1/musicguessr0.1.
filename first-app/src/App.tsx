//import ListGroup from "./components/ListGroup";
import { Alert } from "./components/Alert";
import { Button } from "./components/Button";
import { useState } from "react";
import "./App.css";

function App() {
  // let elements = ["Jan", "Andrzej", "Kasia", "Marta", "Zofia"];

  // const handleSelectItem = (element: string) => {
  //   console.log(element);
  // };

  // return (
  //   <div>
  //     <ListGroup
  //       elements={elements}
  //       title="Imiona"
  //       onSelectItem={handleSelectItem}
  //     />
  //   </div>
  // );

  // return (
  //   <div>
  //     <Alert>
  //       <h1>wiadomosc!</h1>
  //     </Alert>
  //   </div>
  // );
  const [showAlert, setShowAlert] = useState(false);

  const handleButtonClick = () => {
    setShowAlert(true);
  };
  return (
    <div>
      <Button onClick={handleButtonClick}>Nacisnij mnie!</Button>
      {showAlert && (
        <Alert onClose={() => setShowAlert(false)}>kliknieto!</Alert>
      )}
    </div>
  );
}

export default App;
