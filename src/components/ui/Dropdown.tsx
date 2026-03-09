import React, {
  useRef,
  useEffect,
  useState,
  createContext,
  useContext,
} from "react";

interface DropdownContextType {
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
}

const DropdownContext = createContext<DropdownContextType>({
  openDropdownId: null,
  setOpenDropdownId: () => {},
});

export const DropdownProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  return (
    <DropdownContext.Provider value={{ openDropdownId, setOpenDropdownId }}>
      {children}
    </DropdownContext.Provider>
  );
};

const useDropdownContext = () => useContext(DropdownContext);

interface DropdownProps {
  id: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  menuClassName?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  id,
  trigger,
  children,
  align = "left",
  className = "",
  menuClassName = "",
}) => {
  const { openDropdownId, setOpenDropdownId } = useDropdownContext();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOpen = openDropdownId === id;

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(isOpen ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdownId(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setOpenDropdownId]);

  const handleBlur = (e: React.FocusEvent) => {
    if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
      setOpenDropdownId(null);
    }
  };

  const alignmentStyles = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 -translate-x-1/2",
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative z-50 inline-block ${className}`}
      onBlur={handleBlur}
    >
      <div
        onClick={toggleDropdown}
        className="cursor-pointer w-full h-full "
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`
            absolute mt-4.5 z-50 animate-fade-in-down animate-duration-300
            ${alignmentStyles[align]}
          `}
          style={{
            minWidth: "max-content",
          }}
        >
          <div
            className={`border border-background-700 rounded-lg shadow-lg ${menuClassName}`}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  onClick,
  children,
  className = "",
  icon,
  disabled = false,
}) => {
  const { setOpenDropdownId } = useDropdownContext();

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
      setOpenDropdownId(null);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full px-4 py-2 text-left text-sm rounded
        flex flex-col items-center justify-center 
        transition-colors
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

// Componente para divisor
export const DropdownDivider: React.FC = () => {
  return <div className="border-t border-white/20 my-1" />;
};

// Componente para sección con título
interface DropdownSectionProps {
  title?: string;
  children: React.ReactNode;
}

export const DropdownSection: React.FC<DropdownSectionProps> = ({
  title,
  children,
}) => {
  return (
    <div className="py-1">
      {title && (
        <div className="px-4 py-2 text-xs font-semibold text-text-50 uppercase tracking-wider">
          {title}
        </div>
      )}
      {children}
    </div>
  );
};
