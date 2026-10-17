// "Edit" tab: the formula's numbers and letters as labelled fields, so nobody has to read LaTeX.
// Focusing a field highlights that piece in the preview; typing rewrites only that piece. A field takes
// anything the Type tab takes (2, -3, x, pi, n+1), so one number can become a whole expression.
import { useMemo, useRef, useState } from "react";
import { PART_KIND_LABEL, groupParts, parseParts, partDisplay, replacePart } from "./latexParts.js";

function PartField({ part, onFocus, onEdit, onBlur }) {
  const [draft, setDraft] = useState(null); // what is being typed while the field has focus
  const shown = draft ?? partDisplay(part);
  const problem = draft !== null && replacePart("", { start: 0, end: 0, bare: false, solo: true }, draft).error;
  return (
    <input
      type="text"
      value={shown}
      size={Math.max(2, Math.min(14, shown.length + 1))}
      aria-label={`${part.label}: ${PART_KIND_LABEL[part.kind]} ${partDisplay(part)}`}
      aria-invalid={problem ? true : undefined}
      autoCapitalize="off"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      onFocus={(e) => { setDraft(partDisplay(part)); onFocus(part); e.currentTarget.select(); }}
      onChange={(e) => { setDraft(e.target.value); onEdit(e.target.value); }}
      onBlur={() => { setDraft(null); onBlur(); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className={`h-9 min-w-[2.5rem] rounded-md border bg-white px-1.5 text-center font-mono text-[14px] ${problem ? "border-danger" : part.kind === "number" ? "border-line" : "border-line text-accent-strong"}`}
    />
  );
}

export default function EquationParts({ latex, onChange, onHighlight, compact = false }) { // onHighlight: optional, called with the range being edited
  const parts = useMemo(() => parseParts(latex), [latex]);
  const groups = useMemo(() => groupParts(parts), [parts]);
  // While a field has focus, every keystroke rewrites the SAME original piece, so a half-typed
  // value like "x+" can never damage the rest of the formula
  const session = useRef(null);

  const focus = (part) => {
    session.current = { part, base: latex };
    onHighlight?.({ start: part.start, end: part.end });
  };
  const edit = (text) => {
    const s = session.current;
    if (!s) return;
    const result = replacePart(s.base, s.part, text);
    if (result.error) return; // not a complete value yet: keep the last good formula
    onChange(result.latex);
    onHighlight?.({ start: result.start, end: result.end });
  };
  const blur = () => { session.current = null; onHighlight?.(null); };

  if (!parts.length) {
    return <p className="rounded-md bg-sunken px-3 py-2.5 text-sm text-gray-700">There are no numbers or letters to change yet. Use <strong className="font-medium">Type a formula</strong>, <strong className="font-medium">Templates</strong> or <strong className="font-medium">Keys and LaTeX</strong> to build one.</p>;
  }

  return (
    <div className="space-y-2.5">
      {!compact && <p className="text-xs leading-5 text-muted">Change any number or letter. Type <span className="font-mono">x+1</span> or <span className="font-mono">pi</span> to put a whole expression there.</p>}
      <div className={`scroll-thin space-y-2.5 ${compact ? "max-h-28 overflow-y-auto pr-1" : ""}`}>
        {groups.map((g) => (
          <div key={`${g.group}-${g.parts[0].index}`}>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">{g.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.parts.map((part) => <PartField key={part.index} part={part} onFocus={focus} onEdit={edit} onBlur={blur} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
