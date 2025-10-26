// import { Fragment } from "react/jsx-runtime";

import { useState } from "react";

interface Props {
  elements: string[];
  title: string;
  onSelectItem: (element: string) => void;
}

function ListGroup({ elements, title, onSelectItem }: Props) {
  //let selectedIndex = 1;

  const [selectedIndex, setSelectedIndex] = useState(-1);

  //   const message =
  //     elements.length === 0 ? <p>Nie znaleziono elementow</p> : null;

  // const getMessage = () => {
  //     return elements.length === 0 ? <p>Nie znaleziono elementow</p> : null;
  // }

  //   if (elements.length === 0)
  //     return (
  //       <>
  //         <h1>lista elementow</h1>
  //         <p>Nie znaleziono elementow</p>
  //       </>
  //     );

  return (
    <>
      <h1>{title}</h1>

      {/* {getMessage()}
      {message} */}
      {/* {elements.length === 0 ? <p>Nie znaleziono elementow</p> : null} */}

      {elements.length === 0 && <p>Nie znaleziono elementow</p>}

      <ul className="list-group">
        {elements.map((name, index) => (
          <li
            key={name}
            className={
              selectedIndex === index
                ? "list-group-item active"
                : "list-group-item"
            }
            onClick={() => {
              setSelectedIndex(index);
              onSelectItem(name);
            }}
          >
            {name}
          </li>
        ))}
      </ul>
    </>
  );
}

export default ListGroup;
