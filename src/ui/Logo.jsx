// Boardly mark: a "B" drawn as a single pen stroke on a blue tile, with a coral flick like the tail of a marker.
export default function Logo({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Boardly">
      <rect width="32" height="32" rx="7" fill="#2540D9" />
      <path d="M9 22.5V9.5h6.2c2.4 0 3.9 1.2 3.9 3.2 0 1.4-.8 2.4-2 2.8 1.6.3 2.6 1.4 2.6 3 0 2.2-1.7 4-4.4 4H9Z" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M21.5 24.2c1.6-1 3-2.6 3.6-5" stroke="#FF8A6B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
