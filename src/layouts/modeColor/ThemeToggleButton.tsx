// src/components/ThemeToggleButton.tsx
import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { IconMoon, IconSun } from "@tabler/icons-react";

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="text-text-300 w-6 h-6 flex justify-center items-center transition-all duration-300 outline outline-transparent p-0.5 bg-linear-to-b from-bg-100 to-bg-300 border-t border-t-white/20 shadow-lg shadow-bg-100 rounded-full"
      title="Cambiar Tema"
    >
      {theme === "dark" ? (
        <IconSun size={17} className="text-yellow-400 hover:text-text-100" />
      ) : (
        <IconMoon size={17} className="text-text-300" />
      )}
    </button>
  );
};

export default ThemeToggleButton;
