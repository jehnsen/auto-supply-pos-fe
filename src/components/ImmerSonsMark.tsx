/**
 * The ImmerSons AutoMoto mark: the signage glyph seated in a machined hex bezel, the way a
 * badge is bolted to a housing. Drawn as inline SVG so it stays crisp at any size.
 *
 * Colours are literal rather than themed — a logo must not shift with light/dark mode.
 */
export function ImmerSonsMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="ImmerSons AutoMoto"
    >
      <defs>
        {/* Bezel shading: light from above, so the housing reads as turned metal. */}
        <linearGradient id="ism-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE55C" />
          <stop offset="100%" stopColor="#E6BE00" />
        </linearGradient>
      </defs>

      {/* Hex housing — a fastener head, and a harder silhouette than a circle. */}
      <path
        d="M24 1.5 L43.5 12.75 V35.25 L24 46.5 L4.5 35.25 V12.75 Z"
        fill="url(#ism-bezel)"
        stroke="#C81E1E"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* The signage stroke */}
      <path
        d="M30.5 16c-2.2-2.6-6-3.4-9.1-2.2-3.6 1.4-5.6 5.2-4.8 8.9.6 2.8 2.9 4.6 5.4 5.7 2 .9 4.3 1.6 5.1 3.4.7 1.6-.1 3.6-1.7 4.5-2.3 1.3-5.4.6-7.1-1.4"
        fill="none"
        stroke="#C81E1E"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <circle cx="18.5" cy="15" r="3.4" fill="none" stroke="#C81E1E" strokeWidth="2.2" />
    </svg>
  );
}
