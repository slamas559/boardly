// The sections of the landing page below the hero. Every claim here is something the app does today.
import { Link } from "react-router-dom";
import { ArrowRight, Check, Plus } from "lucide-react";
import { ChartArt, FollowArt, MathArt, PdfArt, PhoneListener, VoiceArt } from "./art.jsx";

export const Container = ({ className = "", children }) => (
  <div className={`mx-auto max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>
);

const Eyebrow = ({ children, tone = "text-accent" }) => (
  <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${tone}`}>{children}</p>
);

/* ------------------------------------------------------------------ */

const steps = [
  {
    n: "1", tone: "text-accent", title: "Open a room",
    text: "Give it a topic. Run it free, or set a price in naira. The room keeps its board, pages and PDF, so next week you carry on where you stopped.",
  },
  {
    n: "2", tone: "text-coral-500", title: "Share the link",
    text: "Listeners open it on any device. For a free session they do not need an account. Paste a link or a code on the front page to join someone else's room.",
  },
  {
    n: "3", tone: "text-leaf-500", title: "Teach",
    text: "Draw, write, plot a graph, drop in a PDF. Everyone follows your page and zoom as you go. They can look around on their own and jump back to you with one tap.",
  },
  {
    n: "4", tone: "text-sun-700", title: "Wrap up",
    text: "On a laptop you can record the session, with your voice and camera if you want them, and share the video. The board stays in the room for next time.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 border-y border-line bg-surface">
      <Container className="grid gap-12 py-20 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:py-28">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="font-hand text-3xl text-coral-600">from link to lesson</p>
          <h2 className="font-display mt-2 text-4xl leading-[1.05] sm:text-5xl">A session, start to finish</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-gray-600">
            No installs and no setup on your listeners' side. Most of the work is already done by the time they open the link.
          </p>
        </div>
        <ol className="space-y-9">
          {steps.map((step) => (
            <li key={step.n} className="grid grid-cols-[3.5rem_1fr] items-start gap-4 sm:grid-cols-[4.5rem_1fr]">
              <span className={`font-hand text-6xl leading-[0.9] sm:text-7xl ${step.tone}`} aria-hidden="true">{step.n}</span>
              <div className="border-t border-line pt-4">
                <h3 className="font-display text-2xl">{step.title}</h3>
                <p className="mt-2 max-w-xl text-[17px] leading-relaxed text-gray-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const Tag = ({ tone, children }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{children}</span>
);

function Feature({ className = "", tone = "border-line bg-white", art, title, children, tags, artFirst = false }) {
  return (
    <article className={`flex flex-col overflow-hidden rounded-xl border ${tone} ${className}`}>
      <div className={`p-4 sm:p-5 ${artFirst ? "order-first" : "order-first"}`} aria-hidden="true">{art}</div>
      <div className="flex flex-1 flex-col px-5 pb-6 pt-1 sm:px-6">
        <h3 className="font-display text-2xl leading-tight">{title}</h3>
        <p className="mt-2.5 text-[17px] leading-relaxed text-gray-600">{children}</p>
        {tags && <div className="mt-4 flex flex-wrap gap-2">{tags}</div>}
      </div>
    </article>
  );
}

const alsoInTheRoom = [
  ["Pages", "As many as the lesson needs, each remembering where you were."],
  ["Layers", "Bring a drawing to the front or send it behind another."],
  ["Laser pointer", "Point at something and the whole room sees it move."],
  ["Reveal covers", "Hide part of the board, then uncover it when you are ready."],
  ["Rulers and protractors", "Measure and draw to scale with a ruler, protractor and set squares."],
  ["Questions and polls", "Take questions and quick votes without stopping the board."],
  ["Recording", "Capture a session on a laptop and share the video."],
  ["Teaching aids", "Number lines, unit circles and fraction bars, ready to drop in."],
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-16">
      <Container className="py-20 lg:py-28">
        <div className="max-w-2xl">
          <Eyebrow>What is inside</Eyebrow>
          <h2 className="font-display mt-3 text-4xl leading-[1.05] sm:text-5xl">Made for explaining maths, data and documents</h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-600">
            These are not pictures pasted onto a canvas. A graph, an equation or a solid is a live object that you can edit, move and resize on the board your listeners are already watching.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-12">
          <Feature
            className="lg:col-span-7"
            art={<MathArt />}
            title="Maths you can change while they watch"
            tags={<>
              <Tag tone="bg-accent-soft text-accent-strong">Graphs</Tag>
              <Tag tone="bg-coral-50 text-coral-600">Equation editor</Tag>
              <Tag tone="bg-ocean-50 text-ocean-700">3D solids</Tag>
              <Tag tone="bg-leaf-50 text-leaf-700">Statistics</Tag>
            </>}
          >
            Plot functions and drag a slider to see them change. Write equations with a visual editor. Drop in a cube, cone or sphere and turn it around, or draw any shape and spin it into a solid, with the volume and surface area worked out step by step.
          </Feature>

          <Feature className="lg:col-span-5" tone="border-leaf-100 bg-leaf-50" art={<ChartArt />} title="Charts from your own data">
            Upload a CSV or Excel file, or paste straight from a spreadsheet. Get a histogram, box plot or scatter plot in a click, and pick which columns to use.
          </Feature>

          <Feature className="lg:col-span-5" tone="border-ocean-100 bg-ocean-50" art={<PdfArt />} title="The board and the document share one room">
            Upload a PDF and highlight, underline and write on it live. Switch between the document and the board and everyone comes with you.
          </Feature>

          <Feature className="lg:col-span-7" art={<FollowArt />} title="Everyone follows. Nobody gets stuck.">
            Listeners follow your page and your view automatically. If someone wants a closer look at a corner of the board, they can pan and zoom on their own, then jump back to you with one tap.
          </Feature>

          <article className="overflow-hidden rounded-xl border border-sun-100 bg-sun-50 lg:col-span-12">
            <div className="grid items-center gap-6 p-5 sm:p-8 lg:grid-cols-[5fr_6fr] lg:gap-12">
              <div>
                <h3 className="font-display text-2xl leading-tight sm:text-3xl">Voice, captions and questions for a big room</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-gray-700">
                  Talk to the whole room, with live captions for those who need them. When someone has something to say, let them speak: one person, or everyone, and you can switch it off again at any moment.
                </p>
                <ul className="mt-5 space-y-2.5 text-[16px] text-gray-700">
                  {[
                    "Voice built for large rooms, with several people able to speak at once",
                    "You decide who can speak and who can draw",
                    "Listeners can mute themselves, and the room, whenever they like",
                  ].map((line) => (
                    <li key={line} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-sun-700" strokeWidth={2.4} />{line}</li>
                  ))}
                </ul>
              </div>
              <div aria-hidden="true"><VoiceArt /></div>
            </div>
          </article>
        </div>

        <div className="mt-16 grid gap-x-12 gap-y-2 lg:grid-cols-[4fr_8fr]">
          <h3 className="font-display text-2xl">Also in the room</h3>
          <dl className="grid gap-x-10 sm:grid-cols-2">
            {alsoInTheRoom.map(([term, text], index) => (
              <div key={term} className="flex gap-3 border-t border-line py-4">
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${["bg-accent", "bg-coral-500", "bg-leaf-500", "bg-sun-500", "bg-ocean-500"][index % 5]}`} aria-hidden="true" />
                <div>
                  <dt className="font-semibold">{term}</dt>
                  <dd className="mt-0.5 text-[15px] leading-relaxed text-gray-600">{text}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const decisions = [
  ["A link is the whole sign-up.", "For a free session, anyone with the link is in. They do not install an app or make an account to listen."],
  ["Phones come first for listeners.", "Most students will join on a phone, so the board, the PDF and the charts are built to read on a small screen. Recording the session is a laptop feature."],
  ["Maths and data are built in.", "Graphs, equations, solids and statistics are tools on the board, not images you have to make somewhere else and paste in."],
  ["You decide who touches the board.", "Listeners cannot draw or speak until you allow one person, or everyone. They can only change their own work, and you can take it back at any time."],
];

export function Decisions() {
  return (
    <section className="border-t border-line bg-surface">
      <Container className="grid gap-10 py-20 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:py-28">
        <div>
          <Eyebrow tone="text-coral-600">Why it feels different</Eyebrow>
          <h2 className="font-display mt-3 text-4xl leading-[1.05] sm:text-5xl">Four decisions we made early</h2>
        </div>
        <dl>
          {decisions.map(([term, text]) => (
            <div key={term} className="border-t border-line py-6 first:border-t-0 first:pt-0 sm:grid sm:grid-cols-[1fr_1.3fr] sm:gap-8">
              <dt className="font-display text-xl leading-snug">{term}</dt>
              <dd className="mt-2 text-[17px] leading-relaxed text-gray-600 sm:mt-0">{text}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const hostPoints = [
  "Draw, write and drop in shapes on an endless board, with pages",
  "Upload a PDF and annotate it live",
  "Plot graphs, build equations and place 3D solids",
  "Let one listener, or everyone, draw or speak",
  "Record the session and share the video",
];
const listenerPoints = [
  "Open a link on any phone, tablet or laptop",
  "Follow the host's page and view automatically",
  "Pan and zoom for a closer look, then jump back",
  "Ask a question or answer a poll",
  "Draw or speak when the host allows it",
];

export function Audience() {
  return (
    <section className="scroll-mt-16">
      <Container className="py-20 lg:py-28">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="rounded-xl border border-accent-soft bg-accent-soft/60 p-6 sm:p-9">
            <Eyebrow>If you teach</Eyebrow>
            <h2 className="font-display mt-3 text-3xl leading-tight sm:text-4xl">You run the room</h2>
            <p className="mt-3 max-w-md text-[17px] leading-relaxed text-gray-700">
              Everything you need to explain something is on one screen, and you choose how much your listeners can do.
            </p>
            <ul className="mt-6 space-y-3">
              {hostPoints.map((point) => (
                <li key={point} className="flex gap-3 text-[17px]"><Check size={19} className="mt-1 shrink-0 text-accent" strokeWidth={2.4} />{point}</li>
              ))}
            </ul>
            <Link to="/register" className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[15px] font-medium text-white hover:bg-accent-strong">
              Start a room <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid items-center gap-6 rounded-xl border border-line bg-white p-6 sm:grid-cols-[1fr_9rem] sm:p-9 lg:grid-cols-1 xl:grid-cols-[1fr_9rem]">
            <div>
              <Eyebrow tone="text-leaf-700">If you listen</Eyebrow>
              <h2 className="font-display mt-3 text-3xl leading-tight sm:text-4xl">You just open the link</h2>
              <ul className="mt-5 space-y-2.5">
                {listenerPoints.map((point) => (
                  <li key={point} className="flex gap-3 text-[16px] text-gray-700"><Check size={18} className="mt-0.5 shrink-0 text-leaf-500" strokeWidth={2.4} />{point}</li>
                ))}
              </ul>
            </div>
            <div className="mx-auto w-36 sm:w-full lg:w-36 xl:w-full" aria-hidden="true"><PhoneListener /></div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 border-y border-line bg-surface">
      <Container className="py-20 lg:py-28">
        <div className="max-w-2xl">
          <Eyebrow tone="text-leaf-700">Pricing</Eyebrow>
          <h2 className="font-display mt-3 text-4xl leading-[1.05] sm:text-5xl">Free to run. Paid when you want it to be.</h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-600">
            Create a room and teach as much as you like. If you want to charge for a session, you set the price.
          </p>
        </div>
        <div className="mt-12 grid overflow-hidden rounded-xl border border-line-strong bg-white md:grid-cols-2">
          <div className="p-6 sm:p-9">
            <p className="font-hand text-3xl text-leaf-500">free sessions</p>
            <ul className="mt-4 space-y-3 text-[17px]">
              {["Open to anyone with the link", "Listeners need no account", "The board, PDF, maths tools and charts", "Voice, captions, questions and recording"].map((line) => (
                <li key={line} className="flex gap-3"><Check size={19} className="mt-1 shrink-0 text-leaf-500" strokeWidth={2.4} />{line}</li>
              ))}
            </ul>
          </div>
          <div className="border-t border-line p-6 sm:p-9 md:border-l md:border-t-0">
            <p className="font-hand text-3xl text-accent">paid sessions</p>
            <ul className="mt-4 space-y-3 text-[17px]">
              {["You set the price in naira", "Listeners pay before they enter", "Your share is paid to your bank account", "Everything in a free session, too"].map((line) => (
                <li key={line} className="flex gap-3"><Check size={19} className="mt-1 shrink-0 text-accent" strokeWidth={2.4} />{line}</li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-muted">Payments are handled by Paystack. See the <Link to="/refund" className="underline underline-offset-2 hover:text-ink">refund policy</Link>.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const questions = [
  ["Do my listeners need an account?", "Not for a free session. They open your link and they are in. A paid session asks listeners to pay first."],
  ["Does it work on a phone?", "Yes, both for listening and for hosting. Recording the screen needs a laptop or desktop browser, because phones cannot capture the screen."],
  ["Can listeners draw or speak?", "Only when you allow it: one person at a time, or everyone. They can change only their own drawings, and you can switch it off again whenever you like."],
  ["Can I teach from my own PDF?", "Yes. Upload it and annotate it live. Switch between the document and the board, and everyone follows."],
  ["Can I record a session?", "Yes, on a laptop or desktop. You choose whether the recording includes your microphone or camera, or only the screen. Recordings are saved to your dashboard so you can share them."],
  ["How do I get paid for a session?", "Set a price in naira when you create the room. Listeners pay before they enter, and your share goes to the bank account you set up."],
];

export function FaqPreview() {
  return (
    <section className="scroll-mt-16">
      <Container className="grid gap-10 py-20 lg:grid-cols-[4fr_8fr] lg:gap-16 lg:py-28">
        <div>
          <Eyebrow tone="text-ocean-700">Questions</Eyebrow>
          <h2 className="font-display mt-3 text-4xl leading-[1.05]">Before you ask</h2>
          <Link to="/faq" className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium text-accent hover:text-accent-strong">
            More answers <ArrowRight size={16} />
          </Link>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {questions.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[18px] font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <Plus size={20} className="mt-1 shrink-0 text-muted transition-transform group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-gray-600">{a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function Closing() {
  return (
    <section className="pb-20 lg:pb-28">
      <Container>
      <div
        className="relative overflow-hidden rounded-2xl bg-accent px-6 py-14 text-white sm:px-12 sm:py-20"
        style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.16) 1.2px, transparent 1.2px)", backgroundSize: "26px 26px" }}
      >
        <p className="font-hand text-3xl text-[#FFC9B8]">your turn</p>
        <h2 className="font-display mt-2 max-w-2xl text-4xl leading-[1.05] sm:text-5xl">Open a room and try it with one friend.</h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
          It takes a minute to set up. Send the link, draw something, and watch it appear on their phone.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-md bg-white px-6 text-[16px] font-semibold text-accent-strong hover:bg-paper">
            Start a room <ArrowRight size={17} />
          </Link>
          <Link to="/faq" className="text-[16px] font-medium text-white underline underline-offset-4 decoration-white/50 hover:decoration-white">Read the FAQ</Link>
        </div>
        <svg className="pointer-events-none absolute bottom-10 right-12 hidden h-44 w-64 lg:block" viewBox="0 0 260 180" fill="none" aria-hidden="true">
          <path d="M236 20C232 96 150 138 42 138" stroke="#FFC9B8" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 11" />
          <path d="M70 114 38 138l34 20" stroke="#FFC9B8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="150" y="40" fill="#FFFFFF" fontFamily="Caveat, cursive" fontSize="34" fontWeight="600" transform="rotate(-6 150 40)">takes a minute</text>
        </svg>
      </div>
      </Container>
    </section>
  );
}
