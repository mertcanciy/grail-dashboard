export function GrailMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="gm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0c872" />
          <stop offset="100%" stopColor="#9a7b2f" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#17191e" />
      <rect x="1.5" y="1.5" width="29" height="29" rx="8.5" fill="none" stroke="url(#gm-gold)" strokeOpacity="0.55" />
      <text
        x="16"
        y="22.2"
        textAnchor="middle"
        fontFamily="var(--font-inter), Inter, sans-serif"
        fontWeight="800"
        fontSize="18"
        fill="url(#gm-gold)"
      >
        G
      </text>
    </svg>
  );
}
