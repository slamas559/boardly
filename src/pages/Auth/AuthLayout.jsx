import { Link } from "react-router-dom";
import Logo from "../../ui/Logo.jsx";

// Two-column auth page: form on the left, a quiet product note on the right (hidden on phones)
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <Link to="/" className="inline-flex items-center gap-2.5 self-start" aria-label="Boardly home">
          <Logo className="h-7 w-7" />
          <span className="text-[17px] font-semibold tracking-tight">Boardly</span>
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-4xl leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <p className="mt-6 text-sm text-muted">{footer}</p>}
        </div>
      </main>
      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:block" aria-hidden="true">
        <svg viewBox="0 0 600 700" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#ffffff" opacity="0.14" /></pattern>
          </defs>
          <rect width="600" height="700" fill="url(#dots)" />
          <path d="M70 470 C 140 380, 210 560, 290 450 S 430 380, 520 470" fill="none" stroke="#6F86FF" strokeWidth="5" strokeLinecap="round" />
          <rect x="130" y="150" width="190" height="110" fill="none" stroke="#F8F7F4" strokeWidth="3" opacity="0.8" />
          <path d="M320 205 H 440" stroke="#F8F7F4" strokeWidth="3" opacity="0.8" strokeLinecap="round" />
          <path d="M424 190 L444 205 L424 220" fill="none" stroke="#F8F7F4" strokeWidth="3" opacity="0.8" strokeLinecap="round" strokeLinejoin="round" />
          <text x="150" y="215" fill="#F8F7F4" fontSize="34" fontFamily="Caveat, cursive" opacity="0.95">x² + 3x = 10</text>
        </svg>
        <div className="relative flex h-full flex-col justify-end p-12">
          <p className="font-display max-w-md text-3xl leading-snug">Everyone sees the same page, the moment you draw on it.</p>
        </div>
      </aside>
    </div>
  );
}

export const fieldClass =
  "h-11 w-full rounded-md border border-line-strong bg-white px-3 text-[15px] placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
export const primaryBtn =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-paper hover:bg-gray-800 disabled:opacity-60";
