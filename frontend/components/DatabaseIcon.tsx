import { Connection } from "./types";

type DatabaseType = "Azure SQL" | "PostgreSQL" | "MySQL" | "MariaDB" | "SQLite" | string;

const DB_ICON_MAP: Record<string, { src: string; alt: string }> = {
  "Azure SQL": { src: "/assets/iconos sql/DeviconAzuresqldatabase.svg", alt: "Azure SQL" },
  "PostgreSQL": { src: "/assets/iconos sql/DeviconPostgresqlWordmark.svg", alt: "PostgreSQL" },
  "MySQL": { src: "/assets/iconos sql/LogosMysql.svg", alt: "MySQL" },
};

interface DatabaseIconProps {
  type?: DatabaseType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

/**
 * Reusable database type icon. Renders the appropriate vendor icon
 * based on connection type, falling back to a generic database SVG.
 */
export function DatabaseIcon({ type, size = "sm", className = "" }: DatabaseIconProps) {
  const sizeClass = SIZE_MAP[size];
  const iconInfo = type ? DB_ICON_MAP[type] : undefined;

  if (iconInfo) {
    return (
      <img
        src={iconInfo.src}
        alt={iconInfo.alt}
        className={`${sizeClass} object-contain ${className}`}
        loading="lazy"
      />
    );
  }

  // Fallback: generic database SVG icon
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${sizeClass} ${className}`}
      aria-hidden="true"
    >
      <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5 6V18C5 19.7 8.1 21 12 21C15.9 21 19 19.7 19 18V6" stroke="currentColor" strokeWidth="2" />
      <path d="M5 12C5 13.7 8.1 15 12 15C15.9 15 19 13.7 19 12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
