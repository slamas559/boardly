import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Smartphone, Sigma, UserRound } from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
import { HeroBoard, PhoneListener } from "./home/art.jsx";
import { Audience, Closing, Container, Decisions, FaqPreview, Features, HowItWorks, Pricing } from "./home/Sections.jsx";

const facts = [
  [UserRound, "text-coral-500", "Listeners need no account for a free session"],
  [Smartphone, "text-leaf-500", "Made to read well on a phone"],
  [Sigma, "text-accent", "Graphs, equations and 3D solids built in"],
];

function Hero() {
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
    <section className="relative overflow-hidden">
      <Container className="grid items-center gap-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-[5fr_7fr] lg:gap-10 lg:pb-24 lg:pt-20">
        <div>
          <p className="font-hand text-3xl text-coral-600">for anyone who explains things</p>
          <h1 className="font-display mt-2 text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.1rem]">
            Teach on a board your whole class can{" "}
            <span className="relative inline-block">
              follow
              <svg className="absolute -bottom-1.5 left-0 h-3 w-full" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 8C44 2 96 3 198 7" fill="none" stroke="#E2492B" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
            .
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
            Boardly is a shared board and document room. You draw, write, plot graphs and mark up PDFs, and everyone who opens your link watches it happen, on a phone, a tablet or a laptop.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-[16px] font-semibold text-white hover:bg-accent-strong">
              Start a room <ArrowRight size={17} />
            </Link>
            <a href="#how" className="inline-flex items-center gap-1.5 text-[16px] font-medium text-gray-800 underline decoration-line-strong underline-offset-4 hover:decoration-accent">
              See how a session works
            </a>
          </div>

          <form onSubmit={join} className="mt-7 flex max-w-md" role="search" aria-label="Join a room">
            <label htmlFor="join-code" className="sr-only">Room code or link</label>
            <input
              id="join-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Joining a room? Paste its code or link"
              className="h-11 min-w-0 flex-1 rounded-l-md border border-r-0 border-line-strong bg-white px-3.5 text-[15px] outline-none placeholder:text-muted focus:border-accent"
            />
            <button type="submit" className="h-11 rounded-r-md border border-line-strong bg-white px-4 text-[15px] font-medium hover:bg-sunken">Join</button>
          </form>

          <ul className="mt-9 space-y-2.5 text-[15px] text-gray-600">
            {facts.map(([Icon, tone, text]) => (
              <li key={text} className="flex items-center gap-2.5"><Icon size={17} className={tone} strokeWidth={2.2} aria-hidden="true" />{text}</li>
            ))}
          </ul>
        </div>

        <figure className="relative md:mb-16 lg:-mr-10">
          <div className="overflow-hidden rounded-xl border border-line-strong bg-white" style={{ boxShadow: "0 30px 60px -34px rgb(37 64 217 / 0.35), 0 8px 20px -12px rgb(23 24 28 / 0.25)" }}>
            <HeroBoard />
          </div>
          <div className="absolute -bottom-20 right-3 hidden w-[19%] min-w-[6.5rem] max-w-[9.5rem] md:block" style={{ filter: "drop-shadow(0 18px 24px rgb(23 24 28 / 0.28))" }}>
            <PhoneListener />
          </div>
          <figcaption className="sr-only">A Boardly room as the host sees it, and the same board following along on a listener's phone.</figcaption>
        </figure>
      </Container>
    </section>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">Skip to the content</a>
      <Header />
      <main id="main" className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <Decisions />
        <Audience />
        <Pricing />
        <FaqPreview />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
