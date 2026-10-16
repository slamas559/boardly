// What a student sees when the host asks the class something: a card docked at the bottom (a bottom sheet on
// phones) that they can tuck away to look at the board, and, when the host shows a classmate's working, a
// full-screen look at it. Everything here comes from the server; students never see the right answer or
// anyone else's answer until the host reveals them.
import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import WorkPad from "./WorkPad.jsx";
import { LETTERS, parseAnswerNumber, percent, showValue } from "./activityLogic.js";

const STATUS_TEXT = { open: "Open", closed: "Closed", revealed: "Results" };

function ChoiceAnswer({ activity, onRespond }) {
  const { options, status, mine, correct, results } = activity;
  const locked = status !== "open";
  return (
    <div className="space-y-2" role="group" aria-label="Choices">
      {options.map((label, index) => {
        const picked = mine?.value === index;
        const isRight = status === "revealed" && correct === index;
        const isWrong = status === "revealed" && picked && correct !== undefined && correct !== null && correct !== index;
        const share = results ? percent(results.counts[index], results.total) : null;
        return (
          <button
            key={index}
            type="button"
            disabled={locked}
            aria-pressed={picked}
            onClick={() => onRespond(index)}
            className={`relative flex min-h-12 w-full items-center gap-3 overflow-hidden rounded-lg border-2 px-3 py-2 text-left text-base transition-colors ${
              isRight ? "border-ok bg-ok-soft" : isWrong ? "border-danger bg-danger-soft" : picked ? "border-accent bg-accent-soft" : "border-line bg-white hover:bg-sunken disabled:hover:bg-white"
            }`}
          >
            {share !== null && <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-black/[0.05]" style={{ width: `${share}%` }} />}
            <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isRight ? "bg-ok text-white" : picked ? "bg-accent text-white" : "bg-sunken text-gray-700"}`}>{LETTERS[index]}</span>
            <span className="relative min-w-0 flex-1 break-words">{label}</span>
            {share !== null && <span className="relative text-sm tabular-nums text-muted">{share}%</span>}
            {isRight && <Check size={18} className="relative text-ok" aria-label="Correct answer" />}
          </button>
        );
      })}
    </div>
  );
}

function NumberAnswer({ activity, onRespond }) {
  const { status, mine, answer, tolerance, results } = activity;
  const [text, setText] = useState(mine ? showValue(mine.value).replace("−", "-") : "");
  const [problem, setProblem] = useState("");
  const locked = status !== "open";
  const submit = (e) => {
    e.preventDefault();
    if (parseAnswerNumber(text) === null) {
      setProblem("Type a number, like 12, 3.5 or 3/4.");
      return;
    }
    setProblem("");
    onRespond(text.trim());
  };
  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={text}
          disabled={locked}
          onChange={(e) => { setText(e.target.value); setProblem(""); }}
          placeholder="Your answer"
          aria-label="Your answer"
          aria-invalid={Boolean(problem) || undefined}
          className={`h-12 min-w-0 flex-1 rounded-lg border-2 bg-white px-3 text-lg tabular-nums ${problem ? "border-danger" : "border-line"}`}
        />
        <button type="submit" disabled={locked || !text.trim()} className="h-12 rounded-lg bg-accent px-5 font-medium text-white hover:opacity-90 disabled:opacity-40">
          {mine ? "Change" : "Send"}
        </button>
      </form>
      {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}
      {mine && status === "open" && <p className="text-sm text-muted">Sent: <span className="font-semibold text-ink">{showValue(mine.value)}</span>. You can change it until the teacher closes the question.</p>}
      {status === "revealed" && (
        <div className="space-y-1 rounded-lg bg-sunken px-3 py-2 text-sm">
          {answer !== undefined && answer !== null && <p>Answer: <span className="font-semibold">{showValue(answer)}</span>{tolerance > 0 ? ` (within ${showValue(tolerance)})` : ""}</p>}
          {results && results.total > 0 && <p className="text-muted">Class: {results.total} answers · mean {showValue(results.mean)} · median {showValue(results.median)}</p>}
        </div>
      )}
    </div>
  );
}

function Verdict({ activity }) {
  if (activity.status !== "revealed" || !activity.mine || activity.mineCorrect === null || activity.mineCorrect === undefined) return null;
  const right = activity.mineCorrect;
  return (
    <p role="status" className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${right ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
      {right ? <Check size={16} /> : <X size={16} />} {right ? "Correct. Well done!" : activity.kind === "choice" && activity.correct !== undefined ? `Not quite. The answer is ${LETTERS[activity.correct]}.` : "Not quite. Check the answer above."}
    </p>
  );
}

export default function ActivityStudent({ activity, onRespond }) {
  const [collapsed, setCollapsed] = useState(false);
  // A new question, or the host closing / revealing it, opens the card again
  useEffect(() => { setCollapsed(false); }, [activity?.id, activity?.status]);
  if (!activity) return null;

  const answered = Boolean(activity.mine);
  const respond = (value) => onRespond(activity.id, value);
  const headline = activity.status === "open"
    ? answered ? "Answer sent" : "Your turn to answer"
    : activity.status === "closed" ? "Question closed" : "Results";

  return (
    <section
      aria-label="Question from your teacher"
      className="float-panel pointer-events-auto fixed inset-x-2 bottom-2 z-40 mx-auto flex max-h-[min(88dvh,46rem)] max-w-xl flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] sm:bottom-4"
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 border-b border-line px-4 py-2.5 text-left"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${activity.status === "open" ? "animate-pulse bg-ok" : "bg-muted"}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-muted">{STATUS_TEXT[activity.status]} · Question</span>
          <span className="block truncate text-sm font-semibold">{collapsed ? activity.prompt : headline}</span>
        </span>
        {collapsed ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
      </button>
      {!collapsed && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <h2 className="text-lg font-semibold leading-snug">{activity.prompt}</h2>
          {activity.kind === "choice" && <ChoiceAnswer activity={activity} onRespond={respond} />}
          {activity.kind === "number" && <NumberAnswer key={activity.id} activity={activity} onRespond={respond} />}
          {activity.kind === "work" && (
            <>
              <WorkPad key={activity.id} disabled={activity.status !== "open"} sent={answered} onSend={respond} />
              {answered && <p className="text-sm text-muted">{activity.status === "open" ? "Sent to your teacher. You can send a new version until the question closes." : "Your teacher has your working."}</p>}
            </>
          )}
          <Verdict activity={activity} />
          {activity.status === "closed" && !answered && <p className="text-sm text-muted">This question is closed. Watch the board for the answer.</p>}
          {activity.status === "open" && activity.kind === "choice" && answered && <p className="text-sm text-muted">You can change your answer until the teacher closes the question.</p>}
        </div>
      )}
    </section>
  );
}

/** A classmate's working, shown full screen by the teacher. Each student can put it away for themselves. */
export function Spotlight({ spotlight }) {
  const [dismissed, setDismissed] = useState("");
  const token = spotlight ? `${spotlight.key}:${spotlight.image.length}` : "";
  useEffect(() => { setDismissed((current) => (current === token ? current : "")); }, [token]);
  if (!spotlight || dismissed === token) return null;
  return (
    <div className="pointer-events-auto fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-ink/80 p-4" role="dialog" aria-modal="true" aria-label="Shared working">
      <div className="flex w-full max-w-3xl items-center justify-between text-white">
        <p className="text-sm font-medium">{spotlight.name ? `${spotlight.name}'s working` : "Shared working"}</p>
        <button type="button" onClick={() => setDismissed(token)} className="flex h-9 items-center gap-1.5 rounded-md bg-white/15 px-3 text-sm hover:bg-white/25"><X size={16} /> Close</button>
      </div>
      <img src={spotlight.image} alt="Shared working" className="max-h-[78dvh] w-full max-w-3xl rounded-lg bg-white object-contain" />
    </div>
  );
}
