//import type { ReactNode } from "react";

interface Props {
  // tresc: string;
  children: string;
  colour?: "primary" | "secondary" | "success" | "warning" | "danger";
  onClick: () => void;
}

export const Button = ({ children, onClick, colour = "warning" }: Props) => {
  return (
    <button type="button" className={"btn btn-" + colour} onClick={onClick}>
      {children}
    </button>
  );
};
