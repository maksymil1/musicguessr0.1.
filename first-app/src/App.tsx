//import ListGroup from "./components/ListGroup";
import { Button } from "./components/Button";

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

  return (
    <div>
      <Button onClick={() => console.log("kliknieto")}>Nacisnij mnie!</Button>
    </div>
  );
}

export default App;
