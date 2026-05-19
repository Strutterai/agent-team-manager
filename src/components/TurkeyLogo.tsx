export function TurkeyLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <style>{`
        @keyframes gobble {
          0%, 70%, 100% { transform: translate(0, 0) rotate(0deg); }
          75% { transform: translate(1px, -1px) rotate(3deg); }
          80% { transform: translate(-1px, 1px) rotate(-2deg); }
          85% { transform: translate(1px, 0) rotate(2deg); }
          90% { transform: translate(-0.5px, -0.5px) rotate(-1deg); }
          95% { transform: translate(0.5px, 0.5px) rotate(1deg); }
          98% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        .turkey-head { animation: gobble 6s ease-in-out infinite; transform-origin: 42px 38px; }
        svg.turkey-svg { animation: idle 2s ease-in-out infinite; }
      `}</style>
      <g className="turkey-svg">
        <path d="M12 38 C10 28, 14 18, 22 12 C26 9, 30 10, 28 16 C26 20, 22 26, 20 32" fill="currentColor" opacity="0.3" />
        <path d="M16 40 C12 32, 12 22, 18 14 C22 10, 26 12, 24 18 C22 24, 18 30, 18 36" fill="currentColor" opacity="0.45" />
        <path d="M20 42 C16 34, 16 24, 22 16 C26 12, 30 14, 28 20 C26 26, 22 34, 22 38" fill="currentColor" opacity="0.6" />
        <ellipse cx="32" cy="42" rx="14" ry="11" fill="currentColor" opacity="0.85" />
        <g className="turkey-head">
          <path d="M42 38 C44 34, 46 28, 46 24 C46 20, 44 18, 42 18 C40 18, 38 20, 38 24 C38 28, 40 34, 40 38" fill="currentColor" />
          <circle cx="44" cy="17" r="5" fill="currentColor" />
          <circle cx="46" cy="16" r="1.2" fill="white" />
          <path d="M49 17 L53 18 L49 19.5 Z" fill="currentColor" opacity="0.7" />
        </g>
        <path d="M28 52 L26 58 M24 58 L28 58 M36 52 L38 58 M36 58 L40 58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </g>
    </svg>
  )
}
