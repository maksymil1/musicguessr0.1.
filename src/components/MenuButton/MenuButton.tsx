import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import "./MenuButton.css";
import nutaLeft from "../../assets/nuta_left.png";
import nutaRight from "../../assets/nuta_right.png";

interface MenuButtonProps {
  label: string;
  to: string;
  external?: boolean;
}

export default function MenuButton({
  label,
  to,
  external = false,
}: MenuButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="button-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {external ? (
        <a className="menu-button" href={to}>
          {label}
        </a>
      ) : (
        <NavLink className="menu-button" to={to}>
          {label}
        </NavLink>
      )}

      <AnimatePresence>
        {isHovered && (
          <>
            <motion.img
              src={nutaLeft}
              alt="notes left"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="note-icon-left"
            />
            <motion.img
              src={nutaRight}
              alt="notes right"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="note-icon-right"
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
