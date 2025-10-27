//import type { ReactNode } from "react";

interface Props {
  // tresc: string;
  children: string;
  colour?: "primary" | "secondary" | "success" | "warning" | "danger";
  klasa?: string;
  onClick: () => void;
}

export const Button = ({
  children,
  onClick,
  colour = "warning",
  klasa = " ",
}: Props) => {
  return (
    <button
      type="button"
      className={"btn btn-" + colour + " " + klasa}
      onClick={onClick}
      // target="_blank"
    >
      {children}
    </button>
  );
};
