import { Button } from "./Button";
// import { useState } from "react";

interface Props {
  opcje: string[];
  klasa?: string;
  onClick: () => void;
}

export const FirstPage = ({ opcje, onClick, klasa = "strona1" }: Props) => {
  return (
    <>
      {opcje.map((opcja) => (
        <Button klasa={klasa} key={opcja} onClick={onClick}>
          {opcja}
        </Button>
      ))}
    </>
  );
};
