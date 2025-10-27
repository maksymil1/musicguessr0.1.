import { Button } from "./Button";
// import { useState } from "react";

interface Props {
  opcje: string[];
  onClick: () => void;
}

export const FirstPage = ({ opcje, onClick }: Props) => {
  return (
    <>
      <div className="strona1">
        {opcje.map((opcja) => (
          <Button key={opcja} onClick={onClick}>
            {opcja}
          </Button>
        ))}
      </div>
    </>
  );
};
