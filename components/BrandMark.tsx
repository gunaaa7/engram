type BrandMarkProps = {
  className?: string;
  title?: string;
  variant?: "app" | "navbar";
};

export function BrandMark({
  className,
  title = "Engram",
  variant = "app",
}: BrandMarkProps) {
  if (variant === "navbar") {
    return (
      <svg
        aria-label={title}
        className={className}
        role="img"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g opacity="0.22" stroke="#D4714E" strokeLinecap="round" strokeWidth="2">
          <path d="M13 21L23 27" />
          <path d="M23 27L31 22" />
          <path d="M31 22L40 28" />
          <path d="M23 27L21 38" />
          <path d="M21 38L31 34" />
          <path d="M31 22L32 32" />
        </g>
        <g fill="#D4714E">
          <circle cx="13" cy="21" r="2.4" />
          <circle cx="23" cy="27" r="2.1" />
          <circle cx="31" cy="22" r="1.9" />
          <circle cx="40" cy="28" r="2.2" />
          <circle cx="21" cy="38" r="1.9" />
        </g>
        <g>
          <circle
            cx="33"
            cy="34"
            r="10"
            fill="white"
            stroke="#1C1917"
            strokeWidth="3"
          />
          <circle cx="33" cy="34" r="3" fill="#1C1917" />
          <path
            d="M40.5 41.5L49 50"
            stroke="#1C1917"
            strokeLinecap="round"
            strokeWidth="3.6"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      aria-label={title}
      className={className}
      role="img"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="18" fill="#0B1116" />
      <g
        opacity="0.42"
        stroke="#8FB7C8"
        strokeLinecap="round"
        strokeWidth="1.8"
      >
        <path d="M12 18L21 24" />
        <path d="M21 24L29 20" />
        <path d="M29 20L38 25" />
        <path d="M21 24L19 35" />
        <path d="M19 35L28 40" />
        <path d="M28 40L39 38" />
        <path d="M29 20L31.5 31.5" />
        <path d="M38 25L31.5 31.5" />
        <path d="M28 40L31.5 31.5" />
      </g>
      <g fill="#D7E9F2">
        <circle cx="12" cy="18" r="2.4" />
        <circle cx="21" cy="24" r="2" />
        <circle cx="29" cy="20" r="1.8" />
        <circle cx="38" cy="25" r="2.1" />
        <circle cx="19" cy="35" r="1.8" />
        <circle cx="28" cy="40" r="2.1" />
        <circle cx="39" cy="38" r="2.2" />
      </g>
      <g>
        <circle
          cx="31.5"
          cy="31.5"
          r="9.5"
          fill="#111C23"
          stroke="#F5FBFF"
          strokeWidth="2.5"
        />
        <circle cx="31.5" cy="31.5" r="2.8" fill="#F5FBFF" />
        <path
          d="M38 38L46 46"
          stroke="#F5FBFF"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </g>
    </svg>
  );
}
