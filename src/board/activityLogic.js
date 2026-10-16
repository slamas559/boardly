// The client's side of class activities: building a question, reading the host's live results, and
// turning results into things for the board. The server does the real checking; this keeps the
// forms honest and the numbers on screen tidy. Pure functions, so they can be tested.

export const ACTIVITY_LIMITS = { prompt: 240, option: 80, minOptions: 2, maxOptions: 6 };
export const LETTERS = "ABCDEF";

export const KINDS = [
  { id: "choice", label: "Multiple choice", hint: "Students tap an answer" },
  { id: "number", label: "Number", hint: "Students type a number" },
  { id: "work", label: "Show your work", hint: "Students draw and send it to you" },
];

export const CHOICE_TEMPLATES = [
  { label: "True / False", options: ["True", "False"] },
  { label: "Yes / No / Not sure", options: ["Yes", "No", "Not sure"] },
  { label: "A B C D", options: ["A", "B", "C", "D"] },
];

/** A number typed the way students type them: 12, -3.5, 3,5 or 3/4. Same rules as the server. */
export function parseAnswerNumber(input) {
  if (typeof input === "number") return Number.isFinite(input) && Math.abs(input) <= 1e9 ? input : null;
  if (typeof input !== "string") return null;
  const text = input.trim().replace(/−/g, "-").replace(/\s+/g, "");
  if (!text || text.length > 30) return null;
  const fraction = text.match(/^([-+]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  let value;
  if (fraction) {
    const bottom = Number(fraction[2]);
    if (bottom === 0) return null;
    value = Number(fraction[1]) / bottom;
  } else if (/^[-+]?\d+,\d+$/.test(text)) value = Number(text.replace(",", "."));
  else if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(text)) value = Number(text);
  else return null;
  return Number.isFinite(value) && Math.abs(value) <= 1e9 ? value : null;
}

/** A blank question form. */
export const emptyDraft = (kind = "choice") => ({
  kind, prompt: "", options: ["", "", "", ""], correct: null, answer: "", tolerance: "",
});

/**
 * Check the form and turn it into what the server expects: { ok, spec } or { ok: false, error }.
 * Blank choices are dropped, and the marked "correct" choice is renumbered to match.
 */
export function draftToSpec(draft) {
  const prompt = draft.prompt.replace(/\s+/g, " ").trim();
  if (!prompt) return { ok: false, error: "Write the question first." };
  if (draft.kind === "work") return { ok: true, spec: { kind: "work", prompt } };
  if (draft.kind === "number") {
    const spec = { kind: "number", prompt };
    if (String(draft.answer).trim() !== "") {
      const answer = parseAnswerNumber(draft.answer);
      if (answer === null) return { ok: false, error: "The correct answer must be a number, like 12, 3.5 or 3/4." };
      spec.answer = answer;
      if (String(draft.tolerance).trim() !== "") {
        const tolerance = parseAnswerNumber(draft.tolerance);
        if (tolerance === null || tolerance < 0) return { ok: false, error: "The allowed difference must be a number, 0 or more." };
        spec.tolerance = tolerance;
      }
    }
    return { ok: true, spec };
  }
  const kept = draft.options.map((text, index) => ({ text: text.replace(/\s+/g, " ").trim(), index })).filter((option) => option.text);
  if (kept.length < ACTIVITY_LIMITS.minOptions) return { ok: false, error: "Write at least two choices." };
  const spec = { kind: "choice", prompt, options: kept.map((option) => option.text) };
  if (draft.correct !== null) {
    const position = kept.findIndex((option) => option.index === draft.correct);
    if (position < 0) return { ok: false, error: "The choice you marked as correct is empty." };
    spec.correct = position;
  }
  return { ok: true, spec };
}

export const percent = (count, total) => (total ? Math.round((count / total) * 100) : 0);

/** How many students picked each choice, from the host's list of answers. */
export function choiceCounts(activity) {
  const counts = (activity.options || []).map(() => 0);
  for (const response of activity.responses || []) if (counts[response.value] !== undefined) counts[response.value]++;
  return counts;
}

/** Mean, median and how many were right, for number answers. */
export function numberSummary(activity) {
  const values = (activity.responses || []).map((response) => response.value).sort((a, b) => a - b);
  const total = values.length;
  const middle = Math.floor(total / 2);
  return {
    total,
    values,
    mean: total ? values.reduce((sum, value) => sum + value, 0) / total : null,
    median: !total ? null : total % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2,
    correct: (activity.responses || []).filter((response) => response.correct === true).length,
  };
}

/** What to put on the board for a choice question: { title, bars, correct } */
export function pollResultsForBoard(activity) {
  const counts = choiceCounts(activity);
  return {
    title: activity.prompt.length > 80 ? `${activity.prompt.slice(0, 77)}…` : activity.prompt,
    bars: activity.options.map((label, index) => ({ label, count: counts[index] })),
    ...(activity.correct === undefined || activity.correct === null ? {} : { correct: activity.correct }),
  };
}

/** Insert or replace one answer in the host's list (a student may change their answer). */
export function upsertResponse(responses, response) {
  const next = responses.filter((existing) => existing.key !== response.key);
  next.push(response);
  return next.sort((a, b) => a.at - b.at);
}

/** "12 of 18 answered" */
export function progressLabel(answered, students) {
  if (!students) return `${answered} answered`;
  return `${Math.min(answered, students)} of ${students} answered`;
}

/** A short, readable way to show a student's number: 3.5, 0.75, −4 */
export function showValue(value) {
  if (!Number.isFinite(value)) return "—";
  return String(Number(value.toPrecision(6))).replace("-", "−");
}
