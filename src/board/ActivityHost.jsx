// The teacher's side of class activities: write a question, watch the answers arrive, show the results and
// the right answer to the class, and put the results on the board. Opens from the "Class" button in the room's
// top bar, over the board on desktop and as a bottom sheet on phones.
import { useEffect, useState } from "react";
import { BarChart3, Check, Eye, Lock, Plus, Radio, Trash2, X } from "lucide-react";
import {
  ACTIVITY_LIMITS, CHOICE_TEMPLATES, KINDS, LETTERS, choiceCounts, draftToSpec, emptyDraft, numberSummary, percent,
  pollResultsForBoard, progressLabel, showValue,
} from "./activityLogic.js";

const chip = "h-8 shrink-0 rounded-md border border-line bg-white px-2.5 text-xs hover:bg-sunken";
const primary = "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40";
const secondary = "flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:bg-sunken disabled:opacity-40";
const FieldLabel = ({ children }) => <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{children}</div>;

/* ------------------------------ writing a question ------------------------------ */

function Composer({ onLaunch }) {
  const [draft, setDraft] = useState(emptyDraft());
  const [problem, setProblem] = useState("");
  const set = (patch) => { setDraft((current) => ({ ...current, ...patch })); setProblem(""); };
  const setOption = (index, value) => set({ options: draft.options.map((option, i) => (i === index ? value : option)) });
  const removeOption = (index) => set({
    options: draft.options.filter((_, i) => i !== index),
    correct: draft.correct === null ? null : draft.correct === index ? null : draft.correct > index ? draft.correct - 1 : draft.correct,
  });
  const launch = () => {
    const result = draftToSpec(draft);
    if (!result.ok) { setProblem(result.error); return; }
    onLaunch(result.spec);
  };

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Kind of question" className="grid grid-cols-3 gap-1 rounded-md bg-sunken p-0.5">
        {KINDS.map((kind) => (
          <button key={kind.id} type="button" aria-pressed={draft.kind === kind.id} onClick={() => set({ kind: kind.id })}
            className={`min-h-10 rounded px-1 text-sm leading-tight ${draft.kind === kind.id ? "bg-white font-medium shadow-sm" : "text-gray-700 hover:text-ink"}`}>{kind.label}</button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted">{KINDS.find((kind) => kind.id === draft.kind).hint}.</p>

      <div>
        <label htmlFor="activity-prompt" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">Question</label>
        <textarea
          id="activity-prompt"
          value={draft.prompt}
          rows={3}
          maxLength={ACTIVITY_LIMITS.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
          placeholder={draft.kind === "work" ? "e.g. Solve 3x + 5 = 20 and show your steps" : "e.g. What is 3/4 + 1/8?"}
          className="w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-base"
        />
      </div>

      {draft.kind === "choice" && (
        <div>
          <FieldLabel>Choices</FieldLabel>
          <div className="space-y-2">
            {draft.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Mark choice ${LETTERS[index]} as correct`}
                  aria-pressed={draft.correct === index}
                  title={draft.correct === index ? "This is the correct answer" : "Mark as the correct answer"}
                  onClick={() => set({ correct: draft.correct === index ? null : index })}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${draft.correct === index ? "border-ok bg-ok text-white" : "border-line bg-white text-gray-600 hover:bg-sunken"}`}
                >
                  {draft.correct === index ? <Check size={16} /> : <span className="text-sm font-semibold">{LETTERS[index]}</span>}
                </button>
                <input
                  type="text"
                  value={option}
                  maxLength={ACTIVITY_LIMITS.option}
                  onChange={(e) => setOption(index, e.target.value)}
                  placeholder={`Choice ${LETTERS[index]}`}
                  aria-label={`Choice ${LETTERS[index]}`}
                  className="h-10 min-w-0 flex-1 rounded-md border border-line bg-white px-2.5 text-sm"
                />
                {draft.options.length > ACTIVITY_LIMITS.minOptions && (
                  <button type="button" aria-label={`Remove choice ${LETTERS[index]}`} onClick={() => removeOption(index)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-danger"><X size={16} /></button>
                )}
              </div>
            ))}
          </div>
          <div className="scroll-thin mt-2 flex gap-1.5 overflow-x-auto pb-1">
            <button type="button" disabled={draft.options.length >= ACTIVITY_LIMITS.maxOptions} className={`${chip} disabled:opacity-40`} onClick={() => set({ options: [...draft.options, ""] })}><Plus size={12} className="mr-1 inline" />Add a choice</button>
            {CHOICE_TEMPLATES.map((template) => (
              <button key={template.label} type="button" className={chip} onClick={() => set({ options: [...template.options], correct: null })}>{template.label}</button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Tap the circle beside the right choice to have answers marked automatically. Students cannot see it until you show the results.</p>
        </div>
      )}

      {draft.kind === "number" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0 text-[11px] font-medium uppercase tracking-wider text-muted">
              Correct answer
              <input type="text" value={draft.answer} onChange={(e) => set({ answer: e.target.value })} placeholder="Optional, e.g. 7/8" className="mt-1.5 h-10 w-full rounded-md border border-line bg-white px-2.5 text-sm normal-case tracking-normal text-ink" />
            </label>
            <label className="min-w-0 text-[11px] font-medium uppercase tracking-wider text-muted">
              Allowed difference
              <input type="text" value={draft.tolerance} disabled={!draft.answer.trim()} onChange={(e) => set({ tolerance: e.target.value })} placeholder="0" className="mt-1.5 h-10 w-full rounded-md border border-line bg-white px-2.5 text-sm normal-case tracking-normal text-ink disabled:opacity-50" />
            </label>
          </div>
          <p className="text-[11px] text-muted">Students can type 12, 3.5 or 3/4. With a correct answer set, each answer is marked automatically. Allow a small difference (such as 0.01) for rounded answers.</p>
        </div>
      )}

      {draft.kind === "work" && (
        <p className="rounded-md bg-sunken px-3 py-2 text-sm text-gray-700">Each student gets a small drawing pad and sends you a picture of their working. Only you see them, and you choose which one to show the class.</p>
      )}

      {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}
      <button type="button" onClick={launch} className={primary}><Radio size={16} /> Ask the class</button>
    </div>
  );
}

/* ------------------------------ watching the answers ------------------------------ */

function Names({ responses, label, mark }) {
  if (!responses.length) return null;
  return (
    <details className="mt-3 rounded-md border border-line px-3 py-2 text-sm">
      <summary className="cursor-pointer select-none text-xs font-medium text-muted">{label}</summary>
      <ul className="mt-2 space-y-1">
        {responses.map((response) => (
          <li key={response.key} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">{response.name}</span>
            <span className="flex shrink-0 items-center gap-1.5 tabular-nums text-muted">
              {mark(response)}
              {response.correct === true && <Check size={14} className="text-ok" aria-label="Correct" />}
              {response.correct === false && <X size={14} className="text-danger" aria-label="Not correct" />}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ChoiceResults({ activity }) {
  const counts = choiceCounts(activity);
  const total = activity.responses.length;
  return (
    <div>
      <div className="space-y-2">
        {activity.options.map((label, index) => {
          const right = activity.correct === index;
          const share = percent(counts[index], total);
          return (
            <div key={index} className="relative overflow-hidden rounded-lg border border-line bg-white">
              <div aria-hidden="true" className={`absolute inset-y-0 left-0 transition-[width] duration-300 ${right ? "bg-ok/25" : "bg-accent/15"}`} style={{ width: `${share}%` }} />
              <div className="relative flex min-h-11 items-center gap-2.5 px-3 py-1.5">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${right ? "bg-ok text-white" : "bg-sunken text-gray-700"}`}>{LETTERS[index]}</span>
                <span className="min-w-0 flex-1 break-words text-sm">{label}</span>
                {right && <Check size={16} className="shrink-0 text-ok" aria-label="Correct answer" />}
                <span className="shrink-0 text-sm font-semibold tabular-nums">{counts[index]}</span>
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">{share}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <Names responses={activity.responses} label="Who answered" mark={(response) => LETTERS[response.value]} />
    </div>
  );
}

function NumberResults({ activity }) {
  const summary = numberSummary(activity);
  const hasKey = activity.answer !== undefined && activity.answer !== null;
  return (
    <div>
      {summary.total > 0 ? (
        <>
          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span><span className="text-muted">Mean</span> <span className="font-semibold tabular-nums">{showValue(summary.mean)}</span></span>
            <span><span className="text-muted">Median</span> <span className="font-semibold tabular-nums">{showValue(summary.median)}</span></span>
            {hasKey && <span><span className="text-muted">Correct</span> <span className="font-semibold tabular-nums">{summary.correct} of {summary.total}</span></span>}
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Answers">
            {activity.responses.map((response) => (
              <li key={response.key} className={`rounded-md border px-2 py-1 text-sm tabular-nums ${response.correct === true ? "border-ok/40 bg-ok-soft text-ok" : response.correct === false ? "border-danger/30 bg-danger-soft text-danger" : "border-line bg-white"}`}>{showValue(response.value)}</li>
            ))}
          </ul>
        </>
      ) : <p className="text-sm text-muted">Waiting for answers…</p>}
      {hasKey && <p className="mt-2 text-xs text-muted">Correct answer: <span className="font-medium text-ink">{showValue(activity.answer)}</span>{activity.tolerance > 0 ? ` (within ${showValue(activity.tolerance)})` : ""}</p>}
      <Names responses={activity.responses} label="Who answered" mark={(response) => showValue(response.value)} />
    </div>
  );
}

function WorkResults({ activity, actions }) {
  const [viewing, setViewing] = useState(null);
  const [showName, setShowName] = useState(false);
  const open = activity.responses.find((response) => response.key === viewing);
  const shared = activity.spotlight;
  return (
    <div>
      {shared && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
          <span className="flex items-center gap-2"><Eye size={15} /> Showing {shared.name ? `${shared.name}'s` : "a"} working to the class</span>
          <button type="button" className="rounded px-2 py-1 text-xs font-medium hover:bg-white/60" onClick={actions.clearSpotlight}>Stop</button>
        </div>
      )}
      {activity.responses.length ? (
        <ul className="grid grid-cols-2 gap-2">
          {activity.responses.map((response) => (
            <li key={response.key}>
              <button type="button" onClick={() => setViewing(response.key)} className={`block w-full overflow-hidden rounded-lg border-2 bg-white text-left ${viewing === response.key ? "border-accent" : "border-line hover:border-gray-400"}`}>
                <img src={response.value} alt={`Working by ${response.name}`} className="block aspect-[8/5] w-full object-cover" />
                <span className="block truncate px-2 py-1.5 text-xs font-medium">{response.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">Waiting for students to send their working…</p>}
      {open && (
        <div className="mt-3 space-y-2 rounded-lg border border-line p-2">
          <img src={open.value} alt={`Working by ${open.name}`} className="block w-full rounded bg-white" />
          <div className="flex items-center justify-between gap-2 px-1 text-sm">
            <span className="min-w-0 truncate font-medium">{open.name}</span>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted"><input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} /> Show their name</label>
          </div>
          <button type="button" className={primary} onClick={() => actions.spotlight(open.key, showName)}><Eye size={16} /> Show to the class</button>
        </div>
      )}
    </div>
  );
}

function Live({ activity, students, actions, boardApi }) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  useEffect(() => { setConfirmEnd(false); }, [activity.id]);
  const answered = activity.responses.length;
  const status = activity.status;
  const canPut = status === "revealed" && ((activity.kind === "choice" && answered > 0) || (activity.kind === "number" && answered > 0));
  const putOnBoard = () => {
    if (activity.kind === "choice") boardApi.current?.addPollResults(pollResultsForBoard(activity));
    else boardApi.current?.addNumberChart({ title: activity.prompt.length > 80 ? `${activity.prompt.slice(0, 77)}…` : activity.prompt, values: numberSummary(activity).values });
  };
  const badge = status === "open" ? { text: "Open for answers", tone: "bg-ok-soft text-ok" } : status === "closed" ? { text: "Closed", tone: "bg-sunken text-gray-700" } : { text: "Results shown to the class", tone: "bg-accent-soft text-accent" };

  return (
    <div className="space-y-4">
      <div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.tone}`}>
          {status === "open" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" /> : status === "closed" ? <Lock size={12} /> : <Eye size={12} />} {badge.text}
        </span>
        <h3 className="mt-2 break-words text-base font-semibold leading-snug">{activity.prompt}</h3>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          <span aria-live="polite">{progressLabel(answered, students)}</span>
          {students > 0 && <span className="tabular-nums">{percent(Math.min(answered, students), students)}%</span>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={students || answered || 1} aria-valuenow={Math.min(answered, students || answered)}>
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${students ? percent(Math.min(answered, students), students) : answered ? 100 : 0}%` }} />
        </div>
      </div>

      {activity.kind === "choice" && <ChoiceResults activity={activity} />}
      {activity.kind === "number" && <NumberResults activity={activity} />}
      {activity.kind === "work" && <WorkResults activity={activity} actions={actions} />}

      <div className="space-y-2 border-t border-line pt-4">
        {status !== "revealed" && activity.kind !== "work" && (
          <button type="button" className={primary} onClick={actions.reveal}><Eye size={16} /> Show results {activity.correct !== undefined || activity.answer !== undefined ? "and the answer" : ""} to the class</button>
        )}
        {status === "open" && <button type="button" className={activity.kind === "work" ? primary : secondary} onClick={actions.close}><Lock size={16} /> Close the question</button>}
        {canPut && <button type="button" className={primary} onClick={putOnBoard}><BarChart3 size={16} /> Put the results on the board</button>}
        {confirmEnd ? (
          <div className="flex gap-2">
            <button type="button" className={`${secondary} !text-danger`} onClick={actions.end}><Trash2 size={16} /> Yes, end it</button>
            <button type="button" className={secondary} onClick={() => setConfirmEnd(false)}>Keep it</button>
          </div>
        ) : (
          <button type="button" className="h-10 w-full rounded-lg text-sm text-muted hover:bg-sunken hover:text-ink" onClick={() => (answered && status !== "revealed" ? setConfirmEnd(true) : actions.end())}>End this question</button>
        )}
      </div>
    </div>
  );
}

export default function ActivityHost({ activity, students, actions, boardApi, onClose }) {
  return (
    <aside
      aria-label="Class activity"
      className="float-panel pointer-events-auto fixed inset-x-2 bottom-2 z-40 flex max-h-[min(86dvh,44rem)] flex-col overflow-hidden sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-14 sm:w-[26rem] sm:max-h-[calc(100dvh-4.5rem)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-semibold">{activity ? "Class question" : "Ask the class"}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-gray-700 hover:bg-sunken"><X size={16} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {activity ? <Live activity={activity} students={students} actions={actions} boardApi={boardApi} /> : <Composer onLaunch={actions.start} />}
      </div>
    </aside>
  );
}
