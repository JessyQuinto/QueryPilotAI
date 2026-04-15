interface AppIconProps {
  name: string;
  className?: string;
}

export function AppIcon({ name, className = "" }: AppIconProps) {
  const stroke = "currentColor";

  switch (name) {
    case "menu":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 7H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M4 12H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M4 17H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "close":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M6 6L18 18" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M18 6L6 18" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "add":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M12 5V19" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M5 12H19" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "grid_view":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="4" y="4" width="7" height="7" stroke={stroke} strokeWidth="2" />
          <rect x="13" y="4" width="7" height="7" stroke={stroke} strokeWidth="2" />
          <rect x="4" y="13" width="7" height="7" stroke={stroke} strokeWidth="2" />
          <rect x="13" y="13" width="7" height="7" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "tune":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 7H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M4 12H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M4 17H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="7" r="2" fill="currentColor" />
          <circle cx="15" cy="12" r="2" fill="currentColor" />
          <circle cx="11" cy="17" r="2" fill="currentColor" />
        </svg>
      );
    case "arrow_back":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M19 12H5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 5L5 12L12 19" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "arrow_forward":
    case "arrow_upward":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M5 12H19" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 5L19 12L12 19" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "database":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <ellipse cx="12" cy="6" rx="7" ry="3" stroke={stroke} strokeWidth="2" />
          <path d="M5 6V18C5 19.7 8.1 21 12 21C15.9 21 19 19.7 19 18V6" stroke={stroke} strokeWidth="2" />
          <path d="M5 12C5 13.7 8.1 15 12 15C15.9 15 19 13.7 19 12" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "dns":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="3" y="4" width="18" height="4" rx="1" stroke={stroke} strokeWidth="2" />
          <rect x="3" y="10" width="18" height="4" rx="1" stroke={stroke} strokeWidth="2" />
          <rect x="3" y="16" width="18" height="4" rx="1" stroke={stroke} strokeWidth="2" />
          <path d="M7 6h.01M7 12h.01M7 18h.01" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "description":
    case "auto_stories":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M6 4H18V20H6V4Z" stroke={stroke} strokeWidth="2" />
          <path d="M9 9H15" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M9 13H15" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "terminal":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 6L10 12L4 18" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 18H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "security":
    case "verified_user":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M12 3L19 6V12C19 16.5 16.2 20.6 12 22C7.8 20.6 5 16.5 5 12V6L12 3Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 12L11 14L15 10" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "check":
    case "check_circle":
    case "verified":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="2" />
          <path d="M8 12L11 15L16 9" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "error":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M12 3L22 21H2L12 3Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 9V13" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      );
    case "delete":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 7H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M10 11V17" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M14 11V17" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M6 7L7 19H17L18 7" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 7L10 5H14L15 7" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "edit":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 20H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M6 14L14.5 5.5C15.3 4.7 16.6 4.7 17.4 5.5L18.5 6.6C19.3 7.4 19.3 8.7 18.5 9.5L10 18H6V14Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "link":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="3" y="10" width="8" height="4" rx="2" stroke={stroke} strokeWidth="2" />
          <rect x="13" y="10" width="8" height="4" rx="2" stroke={stroke} strokeWidth="2" />
          <path d="M10 12H14" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "play_arrow":
    case "play_circle":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="2" />
          <path d="M10 9L16 12L10 15V9Z" fill="currentColor" />
        </svg>
      );
    case "history":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 12A8 8 0 1 0 6.3 6.3" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M4 4V10H10" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 8V12L15 14" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "chat_bubble":
    case "Chat":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M5 5H19V15H9L5 19V5Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "cloud":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M7 18H18C20.2 18 22 16.2 22 14C22 11.8 20.2 10 18 10C17.8 6.7 15.1 4 11.8 4C8.8 4 6.2 6.2 5.7 9.1C3.7 9.4 2 11.1 2 13.2C2 15.6 4 17.6 6.4 17.6" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "cable":
    case "schema":
    case "layers":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M12 4L20 8L12 12L4 8L12 4Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M4 12L12 16L20 12" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M4 16L12 20L20 16" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "psychology":
    case "lightbulb":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M9 18H15" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M10 21H14" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M8 14C6.7 12.9 6 11.2 6 9.5C6 6.5 8.5 4 11.5 4H12.5C15.5 4 18 6.5 18 9.5C18 11.2 17.3 12.9 16 14L15 16H9L8 14Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "apartment":
    case "domain":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" stroke={stroke} strokeWidth="2" />
          <path d="M9 8H11" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M13 8H15" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M9 12H11" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M13 12H15" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M11 20V16H13V20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "waving_hand":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M8 12V5C8 4.4 8.4 4 9 4C9.6 4 10 4.4 10 5V10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M10 10V4C10 3.4 10.4 3 11 3C11.6 3 12 3.4 12 4V10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 10V5C12 4.4 12.4 4 13 4C13.6 4 14 4.4 14 5V11" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M14 11V7C14 6.4 14.4 6 15 6C15.6 6 16 6.4 16 7V14C16 17.3 13.3 20 10 20C6.7 20 4 17.3 4 14V11C4 10.4 4.4 10 5 10C5.6 10 6 10.4 6 11V13" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "receipt_long":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M6 3H18V21L15 19L12 21L9 19L6 21V3Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 8H15" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M9 12H15" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "masks":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 7L12 4L20 7V12C20 16 16.4 19.5 12 21C7.6 19.5 4 16 4 12V7Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 12H10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M14 12H15" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M9 16C10 16.7 11 17 12 17C13 17 14 16.7 15 16" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "lock_open":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke={stroke} strokeWidth="2" />
          <path d="M9 11V8C9 6.3 10.3 5 12 5C13.7 5 15 6.3 15 8" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "fullscreen":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 9V4H9" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 9V4H15" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 15V20H9" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 15V20H15" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "close_fullscreen":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M9 9H4V4" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 9H20V4" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 15H4V20" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 15H20V20" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "construction":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M3 21L11 13" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M13 11L21 3" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M14 4L20 10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M4 14L10 20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "hourglass_empty":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M6 3H18" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M6 21H18" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M7 4C7 8 11 9 12 12C13 15 17 16 17 20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M17 4C17 8 13 9 12 12C11 15 7 16 7 20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "public":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="2" />
          <path d="M3 12H21" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 3C14.5 5.5 14.5 18.5 12 21" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 3C9.5 5.5 9.5 18.5 12 21" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "train":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="6" y="4" width="12" height="12" rx="2" stroke={stroke} strokeWidth="2" />
          <circle cx="9" cy="13" r="1" fill="currentColor" />
          <circle cx="15" cy="13" r="1" fill="currentColor" />
          <path d="M8 18L6 21" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M16 18L18 21" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M13 2L5 13H11L9 22L19 10H13L13 2Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "clear_chat":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M5 5H19V15H9L5 19V5Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 8L15 14" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M15 8L9 14" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "chevron_right":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M9 6L15 12L9 18" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" stroke={stroke} strokeWidth="2" />
        </svg>
      );
  }
}
