import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";

// A drawn-by-hand picture of the product, so the page shows the thing instead of describing it
function BoardPreview() {
  return (
    <figure className="relative" aria-label="Preview of a Boardly room">
      <div className="overflow-hidden rounded-lg border border-line-strong bg-white" style={{ boxShadow: "0 24px 48px -28px rgb(23 24 28 / 0.35)" }}>
        <div className="flex h-9 items-center gap-2 border-b border-line bg-surface px-3 text-xs text-muted">
          <span className="font-medium text-ink">Quadratics · Week 3</span>
          <span className="ml-auto flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ok" /> 14 listening</span>
        </div>
        <svg viewBox="0 0 640 400" className="block w-full" role="img" aria-hidden="true">
          <defs>
            <pattern id="hp-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#d6d3cb" /></pattern>
          </defs>
          <rect width="640" height="400" fill="url(#hp-dots)" />
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M120 300 H 560" stroke="#17181C" strokeWidth="2.5" />
            <path d="M200 340 V 70" stroke="#17181C" strokeWidth="2.5" />
            <path d="M200 300 C 250 120, 300 100, 350 180 S 450 330, 520 160" stroke="#2540D9" strokeWidth="4" />
            <circle cx="350" cy="182" r="7" stroke="#E2492B" strokeWidth="3" />
            <path d="M388 120 L 360 168" stroke="#E2492B" strokeWidth="3" />
          </g>
          <text x="392" y="112" fontFamily="Caveat, cursive" fontSize="30" fill="#E2492B">vertex</text>
          <text x="236" y="60" fontFamily="Caveat, cursive" fontSize="30" fill="#17181C">y = ax² + bx + c</text>
          <rect x="52" y="52" width="2" height="0" />
        </svg>
        {/* tool rail */}
        <div className="absolute left-3 top-14 flex flex-col gap-1 rounded-lg border border-line bg-white p-1" aria-hidden="true">
          {["M5 5l5 12 2-5 5-2z", "M4 20l4-1 11-11-3-3L5 16z", "M5 8h14M5 12h14M5 16h9", "M5 5h14v14H5z"].map((d, i) => (
            <span key={i} className={`flex h-7 w-7 items-center justify-center rounded-md ${i === 1 ? "bg-ink text-paper" : "text-gray-600"}`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d={d} /></svg>
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

const hostPoints = [
  "Draw, write and drop shapes on an endless board, with pages",
  "Upload a PDF and highlight, underline and annotate it live",
  "Point with a laser the whole room can see",
  "Switch between board and document; everyone follows",
  "Turn on Q&A and answer questions as they come in",
];
const listenerPoints = [
  "Open a link. No account needed for free sessions",
  "Sees exactly what you see, on a phone, tablet or laptop",
  "Can pan and zoom on their own, then jump back to you",
  "Asks questions without interrupting the board",
  "Hears you with live captions",
];

export default function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const join = (e) => {
    e.preventDefault();
    const raw = code.trim();
    if (!raw) return;
    const match = raw.match(/room\/([A-Za-z0-9]+)/);
    navigate(`/room/${match ? match[1] : raw}`);
  };

  return (
    <div className="min-h-screen bg-paper">
      <Header />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:pb-24">
          <div>
            <h1 className="font-display text-[44px] leading-[1.02] sm:text-6xl lg:text-[68px]">
              A live board for people who teach.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-gray-700">
              Draw, write and mark up PDFs in a room your students join with a link. Everything you do appears on their screen as you do it.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/register" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-medium text-paper hover:bg-gray-800">
                Start a room <ArrowRight size={16} />
              </Link>
              <form onSubmit={join} className="flex" role="search" aria-label="Join a room">
                <label htmlFor="join-code" className="sr-only">Room code or link</label>
                <input
                  id="join-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Have a code? Paste it here"
                  className="h-11 min-w-0 flex-1 rounded-l-md border border-r-0 border-line-strong bg-white px-3 text-sm placeholder:text-gray-400 focus:border-accent focus:outline-none sm:w-60"
                />
                <button type="submit" className="h-11 rounded-r-md border border-line-strong bg-white px-4 text-sm font-medium hover:bg-sunken">Join</button>
              </form>
            </div>
          </div>
          <BoardPreview />
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-px bg-line sm:px-0 md:grid-cols-2">
            {[["When you host", hostPoints], ["When you join", listenerPoints]].map(([title, points]) => (
              <div key={title} className="bg-surface px-4 py-12 sm:px-6 md:px-10">
                <h2 className="font-display text-3xl">{title}</h2>
                <ul className="mt-6 space-y-3.5">
                  {points.map((p) => (
                    <li key={p} className="flex gap-3 text-[15px] leading-snug text-gray-800">
                      <span className="mt-2 h-px w-4 shrink-0 bg-ink" aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">Free to run. Paid when you want it to be.</h2>
            <dl className="divide-y divide-line border-y border-line">
              {[
                ["Community sessions", "Open to anyone with the link. Good for building an audience and a name."],
                ["Paid sessions", "Set a price in naira. Listeners pay before they enter and your share goes to your bank account."],
                ["Your rooms stay", "End a session and pick it up later. The board, pages and document are saved."],
              ].map(([t, d]) => (
                <div key={t} className="grid gap-1 py-5 sm:grid-cols-[13rem_1fr] sm:gap-6">
                  <dt className="text-[15px] font-medium">{t}</dt>
                  <dd className="text-[15px] text-gray-700">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="bg-ink text-paper">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
            <h2 className="font-display max-w-lg text-4xl leading-tight">Open a room in under a minute.</h2>
            <Link to="/register" className="inline-flex h-11 items-center gap-2 rounded-md bg-paper px-5 text-sm font-medium text-ink hover:bg-white">
              Create an account <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
