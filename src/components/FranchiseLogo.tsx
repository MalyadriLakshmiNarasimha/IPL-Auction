'use client';

import React from 'react';

interface FranchiseLogoProps {
  shortCode: string;
  size?: number;
  className?: string;
  showGlow?: boolean;
  color?: string;
}

export const FranchiseLogo: React.FC<FranchiseLogoProps> = ({
  shortCode,
  size = 40,
  className = '',
  showGlow = false,
  color,
}) => {
  const code = (shortCode || '').toUpperCase();

  // Franchise styling & custom SVG marks
  switch (code) {
    case 'CSK':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className} ${showGlow ? 'filter drop-shadow-[0_0_8px_rgba(249,205,5,0.6)]' : ''}`}
        >
          <rect width="64" height="64" rx="16" fill="#18191C" />
          <circle cx="32" cy="32" r="26" fill="#F9CD05" />
          {/* Whistle Podu Roaring Lion Silhouette */}
          <path
            d="M32 14C23 14 18 20 18 26C18 31 22 34 23 37C24 40 22 43 24 46C26 49 30 50 34 50C39 50 44 46 45 42C46 38 43 35 44 32C45 28 48 24 45 19C42 15 37 14 32 14Z"
            fill="#005FA2"
          />
          <circle cx="28" cy="24" r="2" fill="#F9CD05" />
          <path d="M26 31L32 29L30 35L26 31Z" fill="#F9CD05" />
          <text
            x="32"
            y="58"
            fontFamily="Impact, sans-serif"
            fontSize="10"
            fontWeight="900"
            fill="#F9CD05"
            textAnchor="middle"
          >
            CSK
          </text>
        </svg>
      );

    case 'MI':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className} ${showGlow ? 'filter drop-shadow-[0_0_8px_rgba(0,75,160,0.6)]' : ''}`}
        >
          <rect width="64" height="64" rx="16" fill="#18191C" />
          <circle cx="32" cy="32" r="26" fill="#004BA0" />
          {/* Sudarshan Chakra Vortex */}
          <circle cx="32" cy="30" r="14" stroke="#D1AB3E" strokeWidth="3" strokeDasharray="6 3" />
          <path d="M32 16L34 26L42 22L36 30L46 32L36 34L42 42L34 38L32 48L30 38L22 42L28 34L18 32L28 30L22 22L30 26L32 16Z" fill="#D1AB3E" />
          <circle cx="32" cy="30" r="5" fill="#FFFFFF" />
          <text
            x="32"
            y="58"
            fontFamily="Impact, sans-serif"
            fontSize="10"
            fontWeight="900"
            fill="#D1AB3E"
            textAnchor="middle"
          >
            MI
          </text>
        </svg>
      );

    case 'RCB':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className} ${showGlow ? 'filter drop-shadow-[0_0_8px_rgba(227,27,35,0.6)]' : ''}`}
        >
          <rect width="64" height="64" rx="16" fill="#18191C" />
          <path d="M12 14C12 14 32 10 52 14V36C52 48 32 54 32 54C32 54 12 48 12 36V14Z" fill="#E31B23" />
          {/* Royal Lion Crest */}
          <path
            d="M32 18C28 18 25 21 26 25C26 27 28 29 27 32C25 34 23 37 25 40C27 43 31 44 34 43C37 42 39 39 38 36C38 34 36 33 37 30C38 27 41 24 39 20C37 18 34 18 32 18Z"
            fill="#D1AB3E"
          />
          <circle cx="31" cy="23" r="1.5" fill="#18191C" />
          <text
            x="32"
            y="52"
            fontFamily="Impact, sans-serif"
            fontSize="9"
            fontWeight="900"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            RCB
          </text>
        </svg>
      );

    case 'SRH':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className} ${showGlow ? 'filter drop-shadow-[0_0_8px_rgba(242,101,34,0.6)]' : ''}`}
        >
          <rect width="64" height="64" rx="16" fill="#18191C" />
          <circle cx="32" cy="32" r="26" fill="#F26522" />
          {/* Rising Eagle Sun Wings */}
          <circle cx="32" cy="26" r="10" fill="#FFC837" />
          <path d="M16 38C22 30 28 28 32 34C36 28 42 30 48 38C42 42 36 41 32 44C28 41 22 42 16 38Z" fill="#101113" />
          <polygon points="32,24 34,28 30,28" fill="#101113" />
          <text
            x="32"
            y="58"
            fontFamily="Impact, sans-serif"
            fontSize="10"
            fontWeight="900"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            SRH
          </text>
        </svg>
      );

    case 'KKR':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className} ${showGlow ? 'filter drop-shadow-[0_0_8px_rgba(58,34,93,0.8)]' : ''}`}
        >
          <rect width="64" height="64" rx="16" fill="#18191C" />
          <path d="M12 14C12 14 32 8 52 14V34C52 46 32 54 32 54C32 54 12 46 12 34V14Z" fill="#3A225D" />
          {/* Golden Corinthian Knight Helmet & Flame */}
          <path d="M32 14L34 22H30L32 14Z" fill="#F4C430" />
          <path d="M24 24C24 24 32 20 40 24V34C40 38 32 42 32 42C32 42 24 38 24 34V24Z" fill="#F4C430" />
          <rect x="28" y="28" width="8" height="3" rx="1" fill="#3A225D" />
          <line x1="32" y1="31" x2="32" y2="38" stroke="#3A225D" strokeWidth="2" />
          <text
            x="32"
            y="51"
            fontFamily="Impact, sans-serif"
            fontSize="9"
            fontWeight="900"
            fill="#F4C430"
            textAnchor="middle"
          >
            KKR
          </text>
        </svg>
      );

    case 'RR':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className} ${showGlow ? 'filter drop-shadow-[0_0_8px_rgba(234,26,133,0.6)]' : ''}`}
        >
          <rect width="64" height="64" rx="16" fill="#18191C" />
          <circle cx="32" cy="32" r="26" fill="#EA1A85" />
          {/* Royal Crown & Lion */}
          <path d="M22 28L24 20L32 24L40 20L42 28C42 34 32 38 32 38C32 38 22 34 22 28Z" fill="#004BA0" />
          <circle cx="24" cy="19" r="1.5" fill="#D1AB3E" />
          <circle cx="32" cy="23" r="1.5" fill="#D1AB3E" />
          <circle cx="40" cy="19" r="1.5" fill="#D1AB3E" />
          <text
            x="32"
            y="54"
            fontFamily="Impact, sans-serif"
            fontSize="10"
            fontWeight="900"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            RR
          </text>
        </svg>
      );

    case 'DC':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className} ${showGlow ? 'filter drop-shadow-[0_0_8px_rgba(23,68,158,0.6)]' : ''}`}
        >
          <rect width="64" height="64" rx="16" fill="#18191C" />
          <circle cx="32" cy="32" r="26" fill="#17449E" />
          {/* Roaring Tiger Stripes Shield */}
          <path d="M22 22C22 22 32 16 42 22C42 32 32 40 32 40C32 40 22 32 22 22Z" fill="#B9251C" />
          <path d="M28 26L32 22L36 26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 30L32 26L38 30" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <text
            x="32"
            y="56"
            fontFamily="Impact, sans-serif"
            fontSize="10"
            fontWeight="900"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            DC
          </text>
        </svg>
      );

    case 'PBKS':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className} ${showGlow ? 'filter drop-shadow-[0_0_8px_rgba(221,31,45,0.6)]' : ''}`}
        >
          <rect width="64" height="64" rx="16" fill="#18191C" />
          <path d="M14 14C14 14 32 8 50 14V34C50 46 32 54 32 54C32 54 14 46 14 34V14Z" fill="#DD1F2D" />
          {/* Silver Lion Crest */}
          <path d="M26 22L32 16L38 22V32C38 36 32 40 32 40C32 40 26 36 26 32V22Z" fill="#E2E8F0" />
          <circle cx="32" cy="27" r="3" fill="#DD1F2D" />
          <text
            x="32"
            y="51"
            fontFamily="Impact, sans-serif"
            fontSize="9"
            fontWeight="900"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            PBKS
          </text>
        </svg>
      );

    case 'GT':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className} ${showGlow ? 'filter drop-shadow-[0_0_8px_rgba(190,155,82,0.6)]' : ''}`}
        >
          <rect width="64" height="64" rx="16" fill="#18191C" />
          <polygon points="32,8 54,48 10,48" fill="#1B2133" stroke="#BE9B52" strokeWidth="2.5" />
          {/* Golden Lightning Bolt */}
          <polygon points="34,18 24,32 32,32 30,42 40,28 32,28" fill="#BE9B52" />
          <text
            x="32"
            y="58"
            fontFamily="Impact, sans-serif"
            fontSize="10"
            fontWeight="900"
            fill="#BE9B52"
            textAnchor="middle"
          >
            GT
          </text>
        </svg>
      );

    case 'LSG':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className} ${showGlow ? 'filter drop-shadow-[0_0_8px_rgba(0,87,231,0.6)]' : ''}`}
        >
          <rect width="64" height="64" rx="16" fill="#18191C" />
          <circle cx="32" cy="32" r="26" fill="#0057E7" />
          {/* Winged Falcon */}
          <path d="M14 26C22 24 28 28 32 34C36 28 42 24 50 26C44 32 38 34 32 38C26 34 20 32 14 26Z" fill="#E65100" />
          <circle cx="32" cy="24" r="4" fill="#FFFFFF" />
          <text
            x="32"
            y="56"
            fontFamily="Impact, sans-serif"
            fontSize="10"
            fontWeight="900"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            LSG
          </text>
        </svg>
      );

    default:
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-2xl bg-night-raised border border-night-border flex items-center justify-center font-display font-black text-xs text-flare shrink-0 ${className}`}
        >
          {code || 'IPL'}
        </div>
      );
  }
};
