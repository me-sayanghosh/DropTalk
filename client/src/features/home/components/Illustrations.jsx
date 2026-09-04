// Bauhaus Constructivist Geometric Illustrations
// Colors: Red (#D02020), Blue (#1040C0), Yellow (#F0C020), Black (#121212), White (#FFFFFF)

export function E2EEIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hard offset shadow */}
      <rect x="36" y="44" width="56" height="44" fill="#121212" />
      {/* Main Lock Body - Primary Yellow */}
      <rect x="32" y="40" width="56" height="44" fill="#F0C020" stroke="#121212" strokeWidth="3" />
      {/* Shackle - Bauhaus Blue */}
      <path d="M44 40V24C44 15.1634 51.1634 8 60 8C68.8366 8 76 15.1634 76 24V40" stroke="#1040C0" strokeWidth="4" strokeLinecap="square" />
      {/* Keyhole - Primary Red Circle & Black Bar */}
      <circle cx="60" cy="56" r="7" fill="#D02020" stroke="#121212" strokeWidth="2.5" />
      <rect x="58" y="61" width="4" height="12" fill="#121212" />
      {/* Bauhaus Decorative Shapes */}
      <circle cx="18" cy="50" r="10" fill="#D02020" stroke="#121212" strokeWidth="2" />
      <polygon points="102,38 92,58 112,58" fill="#1040C0" stroke="#121212" strokeWidth="2" />
      <line x1="8" y1="84" x2="112" y2="84" stroke="#121212" strokeWidth="2.5" />
    </svg>
  );
}

export function RealTimeIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background hard shadow */}
      <rect x="22" y="24" width="60" height="46" fill="#121212" />
      {/* Speech Bubble - Bauhaus Blue */}
      <rect x="18" y="20" width="60" height="46" fill="#1040C0" stroke="#121212" strokeWidth="3" />
      {/* Signal Bars */}
      <rect x="28" y="36" width="6" height="18" fill="#FFFFFF" />
      <rect x="38" y="28" width="6" height="26" fill="#F0C020" stroke="#121212" strokeWidth="1.5" />
      <rect x="48" y="42" width="6" height="12" fill="#D02020" stroke="#121212" strokeWidth="1.5" />
      <rect x="58" y="32" width="6" height="22" fill="#FFFFFF" />
      {/* Overlapping Primary Red Circle with Live Arrow */}
      <circle cx="88" cy="62" r="22" fill="#D02020" stroke="#121212" strokeWidth="3" />
      <polygon points="88,48 100,64 76,64" fill="#F0C020" stroke="#121212" strokeWidth="2" />
      <circle cx="88" cy="74" r="3" fill="#FFFFFF" />
    </svg>
  );
}

export function AIAssistantIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hard shadow */}
      <circle cx="64" cy="48" r="28" fill="#121212" />
      {/* Central Geometric Spark Circle - Bauhaus Red */}
      <circle cx="60" cy="44" r="28" fill="#D02020" stroke="#121212" strokeWidth="3" />
      {/* 45 degree Rotated Square Spark Core - Bauhaus Yellow */}
      <rect x="52" y="36" width="16" height="16" transform="rotate(45 60 44)" fill="#F0C020" stroke="#121212" strokeWidth="2.5" />
      <circle cx="60" cy="44" r="4" fill="#FFFFFF" />
      {/* Radiating Geometric Nodes */}
      <rect x="22" y="20" width="12" height="12" fill="#1040C0" stroke="#121212" strokeWidth="2" />
      <polygon points="98,16 88,32 108,32" fill="#F0C020" stroke="#121212" strokeWidth="2" />
      <circle cx="28" cy="74" r="7" fill="#F0C020" stroke="#121212" strokeWidth="2" />
      <rect x="88" y="66" width="16" height="16" fill="#1040C0" stroke="#121212" strokeWidth="2" />
      <line x1="34" y1="28" x2="48" y2="38" stroke="#121212" strokeWidth="2" strokeDasharray="3 3" />
      <line x1="88" y1="30" x2="76" y2="38" stroke="#121212" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

export function ThreadRepliesIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Parent Block - White with 3px border */}
      <rect x="18" y="16" width="58" height="30" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
      <line x1="26" y1="26" x2="62" y2="26" stroke="#121212" strokeWidth="3" />
      <line x1="26" y1="34" x2="48" y2="34" stroke="#D02020" strokeWidth="2.5" />
      {/* Branch Connector Line - Bauhaus Red */}
      <path d="M38 46V68H52" stroke="#D02020" strokeWidth="3.5" strokeLinecap="square" />
      {/* Child Thread Block - Primary Yellow */}
      <rect x="56" y="56" width="54" height="32" fill="#121212" />
      <rect x="52" y="52" width="54" height="32" fill="#F0C020" stroke="#121212" strokeWidth="3" />
      <line x1="60" y1="62" x2="94" y2="62" stroke="#121212" strokeWidth="3" />
      <line x1="60" y1="70" x2="82" y2="70" stroke="#1040C0" strokeWidth="2.5" />
      {/* Badge Circle - Bauhaus Blue */}
      <circle cx="94" cy="24" r="12" fill="#1040C0" stroke="#121212" strokeWidth="2.5" />
      <text x="94" y="29" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" fontFamily="Outfit, sans-serif">3</text>
    </svg>
  );
}

export function ReactionsIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background Chat Card */}
      <rect x="18" y="18" width="84" height="36" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
      <line x1="28" y1="30" x2="88" y2="30" stroke="#121212" strokeWidth="2.5" />
      <line x1="28" y1="40" x2="68" y2="40" stroke="#1040C0" strokeWidth="2" />
      {/* Reaction Badge 1 - Yellow Circle */}
      <circle cx="32" cy="72" r="14" fill="#F0C020" stroke="#121212" strokeWidth="2.5" />
      <polygon points="32,64 36,72 44,72 38,77 40,84 32,80 24,84 26,77 20,72 28,72" fill="#121212" />
      {/* Reaction Badge 2 - Red Square */}
      <rect x="54" y="58" width="26" height="26" fill="#D02020" stroke="#121212" strokeWidth="2.5" />
      <circle cx="67" cy="71" r="5" fill="#FFFFFF" />
      {/* Reaction Badge 3 - Blue Triangle */}
      <polygon points="98,58 86,84 110,84" fill="#1040C0" stroke="#121212" strokeWidth="2.5" />
      <circle cx="98" cy="74" r="3" fill="#FFFFFF" />
    </svg>
  );
}

export function ModerationIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <path d="M64 16L24 34V58C24 78 40 94 64 102C88 94 104 78 104 58V34L64 16Z" fill="#121212" />
      {/* Bauhaus Shield - Primary Blue */}
      <path d="M60 12L20 30V54C20 74 36 90 60 98C84 90 100 74 100 54V30L60 12Z" fill="#1040C0" stroke="#121212" strokeWidth="3" />
      {/* Inner Geometry - Yellow and Red */}
      <circle cx="60" cy="50" r="20" fill="#F0C020" stroke="#121212" strokeWidth="2.5" />
      <polygon points="60,38 72,58 48,58" fill="#D02020" stroke="#121212" strokeWidth="2" />
      <circle cx="60" cy="53" r="4" fill="#FFFFFF" />
    </svg>
  );
}

export function PresenceIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hard shadow */}
      <circle cx="64" cy="52" r="30" fill="#121212" />
      {/* Concentric Bauhaus Radar Rings */}
      <circle cx="60" cy="48" r="30" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
      <circle cx="60" cy="48" r="20" fill="none" stroke="#121212" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="60" cy="48" r="10" fill="#D02020" stroke="#121212" strokeWidth="2" />
      {/* Satellite Node Circles */}
      <circle cx="36" cy="30" r="8" fill="#F0C020" stroke="#121212" strokeWidth="2" />
      <rect x="80" y="24" width="14" height="14" fill="#1040C0" stroke="#121212" strokeWidth="2" />
      <circle cx="82" cy="68" r="7" fill="#D02020" stroke="#121212" strokeWidth="2" />
      <polygon points="34,74 24,90 44,90" fill="#F0C020" stroke="#121212" strokeWidth="2" />
      <line x1="36" y1="38" x2="52" y2="44" stroke="#121212" strokeWidth="2" />
      <line x1="80" y1="36" x2="68" y2="44" stroke="#121212" strokeWidth="2" />
    </svg>
  );
}

export function OfflineSyncIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hard shadow */}
      <rect x="30" y="22" width="64" height="60" fill="#121212" />
      <rect x="26" y="18" width="64" height="60" fill="#F0C020" stroke="#121212" strokeWidth="3" />
      {/* Sharp circular cycle arrows */}
      <path d="M42 44A18 18 0 0 1 76 36" stroke="#1040C0" strokeWidth="4" strokeLinecap="square" />
      <polygon points="76,30 84,38 72,42" fill="#1040C0" />
      <path d="M78 52A18 18 0 0 1 44 60" stroke="#D02020" strokeWidth="4" strokeLinecap="square" />
      <polygon points="44,66 36,58 48,54" fill="#D02020" />
      {/* Bauhaus Center Block */}
      <rect x="53" y="41" width="14" height="14" fill="#121212" />
      <rect x="55" y="43" width="10" height="10" fill="#FFFFFF" />
    </svg>
  );
}

export function AccessControlIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Barrier Gate - Black and Yellow stripes */}
      <rect x="20" y="24" width="76" height="52" fill="#FFFFFF" stroke="#121212" strokeWidth="3" />
      <rect x="20" y="32" width="76" height="8" fill="#F0C020" />
      <rect x="20" y="48" width="76" height="8" fill="#D02020" />
      <rect x="20" y="64" width="76" height="8" fill="#1040C0" />
      {/* Access Keycard - Red */}
      <rect x="68" y="44" width="36" height="26" fill="#121212" />
      <rect x="64" y="40" width="36" height="26" fill="#D02020" stroke="#121212" strokeWidth="2.5" />
      <circle cx="76" cy="53" r="5" fill="#FFFFFF" />
      <line x1="84" y1="53" x2="94" y2="53" stroke="#FFFFFF" strokeWidth="2.5" />
      {/* Checkmark Stamp */}
      <circle cx="36" cy="50" r="10" fill="#1040C0" stroke="#121212" strokeWidth="2" />
      <polyline points="31,50 35,54 42,46" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
    </svg>
  );
}

export function SecurityShieldIllustration() {
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Large hard offset shadow */}
      <path d="M108 24L36 58V102C36 146 66 186 108 202C150 186 180 146 180 102V58L108 24Z" fill="#121212" />
      {/* Primary Red Shield */}
      <path d="M100 16L28 50V94C28 138 58 178 100 194C142 178 172 138 172 94V50L100 16Z" fill="#D02020" stroke="#121212" strokeWidth="4" />
      {/* Inner Concentric Circle - Bauhaus Blue */}
      <circle cx="100" cy="98" r="44" fill="#1040C0" stroke="#121212" strokeWidth="4" />
      {/* Rotated 45° Square - Bauhaus Yellow */}
      <rect x="80" y="78" width="40" height="40" transform="rotate(45 100 98)" fill="#F0C020" stroke="#121212" strokeWidth="3" />
      {/* Stark White Core Dot */}
      <circle cx="100" cy="98" r="10" fill="#FFFFFF" stroke="#121212" strokeWidth="2.5" />
      {/* Key Lines */}
      <line x1="44" y1="98" x2="68" y2="98" stroke="#FFFFFF" strokeWidth="3" />
      <line x1="132" y1="98" x2="156" y2="98" stroke="#FFFFFF" strokeWidth="3" />
      <line x1="100" y1="42" x2="100" y2="66" stroke="#FFFFFF" strokeWidth="3" />
      <line x1="100" y1="130" x2="100" y2="154" stroke="#FFFFFF" strokeWidth="3" />
    </svg>
  );
}
