import React from "react";

interface BrewLiteLogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export default function BrewLiteLogo({
  className = "h-9 md:h-10 w-auto",
}: BrewLiteLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 48"
      fill="none"
      className={className}
      aria-label="BrewLite Cashless Coffee"
    >
      <g transform="translate(4, 4)">
        <path
          d="M12 6C12 6 15 12 11 16C7 20 12 24 12 24"
          stroke="#C68B59"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M18 4C18 4 21 11 17 15C13 19 18 23 18 23"
          stroke="#D97736"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M6 18H28C28 27 22.5 32 17 32C11.5 32 6 27 6 18Z"
          fill="#2C1810"
        />
        <path
          d="M28 20H32C34.2 20 36 21.8 36 24C36 26.2 34.2 28 32 28H27"
          stroke="#2C1810"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M4 35H30"
          stroke="#C68B59"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      <text
        x="48"
        y="27"
        fontFamily="var(--font-epilogue), system-ui, -apple-system, sans-serif"
        fontSize="20"
        fontWeight="800"
        fill="#2C1810"
        letterSpacing="-0.5"
      >
        Brew<tspan fill="#C68B59">Lite</tspan>
      </text>
      <text
        x="49"
        y="38"
        fontFamily="var(--font-jakarta), system-ui, -apple-system, sans-serif"
        fontSize="8.5"
        fontWeight="600"
        fill="#8C6D58"
        letterSpacing="1.5"
      >
        CASHLESS COFFEE
      </text>
    </svg>
  );
}
